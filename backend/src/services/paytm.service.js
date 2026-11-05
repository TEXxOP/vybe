const PaytmChecksum = require('paytmchecksum');

const PAISA_PER_RUPEE = 100;
const MIN_AMOUNT_PAISA = 100;

const BASE_URLS = {
    sandbox: 'https://securestage.paytmpayments.com',
    production: 'https://secure.paytmpayments.com',
};

class PaytmConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PaytmConfigurationError';
        this.statusCode = 503;
    }
}

class PaytmApiError extends Error {
    constructor(message, { statusCode = 502, providerStatus } = {}) {
        super(message);
        this.name = 'PaytmApiError';
        this.statusCode = statusCode;
        this.providerStatus = providerStatus;
    }
}

function paytmEnvironment() {
    const environment = String(process.env.PAYTM_ENV || 'sandbox').toLowerCase();
    if (environment === 'sandbox' || environment === 'production') return environment;
    throw new PaytmConfigurationError('PAYTM_ENV must be either sandbox or production');
}

function absoluteUrl(value, label, { httpsRequired = false } = {}) {
    if (!value) throw new PaytmConfigurationError(`${label} is required`);
    try {
        const url = new URL(String(value).trim());
        if (httpsRequired && url.protocol !== 'https:') {
            throw new Error('HTTPS is required');
        }
        return url;
    } catch {
        throw new PaytmConfigurationError(`${label} must be an absolute URL`);
    }
}

function frontendUrl() {
    return absoluteUrl(process.env.FRONTEND_URL, 'FRONTEND_URL', {
        httpsRequired: process.env.NODE_ENV === 'production',
    });
}

function publicApiUrl() {
    return absoluteUrl(process.env.PAYTM_PUBLIC_API_URL, 'PAYTM_PUBLIC_API_URL', {
        httpsRequired: process.env.NODE_ENV === 'production',
    });
}

function getPaytmConfig() {
    if (String(process.env.PAYTM_ENABLED).toLowerCase() !== 'true') {
        throw new PaytmConfigurationError('Paytm payments are not configured yet');
    }

    const environment = paytmEnvironment();
    const config = {
        environment,
        baseUrl: String(process.env.PAYTM_API_BASE_URL || BASE_URLS[environment]).replace(/\/+$/, ''),
        mid: String(process.env.PAYTM_MID || '').trim(),
        merchantKey: process.env.PAYTM_MERCHANT_KEY,
        websiteName: String(process.env.PAYTM_WEBSITE_NAME || (environment === 'sandbox' ? 'WEBSTAGING' : 'DEFAULT')).trim(),
        channelId: String(process.env.PAYTM_CHANNEL_ID || 'WEB').trim(),
        frontendUrl: frontendUrl(),
        publicApiUrl: publicApiUrl(),
    };

    const missing = ['mid', 'merchantKey', 'websiteName', 'channelId'].filter((key) => !config[key]);
    if (missing.length > 0) {
        throw new PaytmConfigurationError('Paytm credentials are incomplete');
    }

    return config;
}

function isPaytmConfigured() {
    try {
        getPaytmConfig();
        return true;
    } catch {
        return false;
    }
}

function toPaisa(amountInRupees) {
    const paisa = Math.round(Number(amountInRupees) * PAISA_PER_RUPEE);
    if (!Number.isSafeInteger(paisa) || paisa < MIN_AMOUNT_PAISA) {
        throw new PaytmConfigurationError('Order total must be at least ₹1.00');
    }
    return paisa;
}

function merchantOrderId(orderId) {
    return `VYBE-PT-${String(orderId)}`;
}

function frontendReturnUrl(orderId, frontend = frontendUrl()) {
    const url = new URL(frontend.toString());
    url.pathname = `${url.pathname.replace(/\/$/, '')}/payment/paytm/return`;
    url.searchParams.set('order', String(orderId));
    return url.toString();
}

function checkoutScriptUrl(config = getPaytmConfig()) {
    return `${config.baseUrl}/merchantpgpui/checkoutjs/merchants/${encodeURIComponent(config.mid)}.js`;
}

function callbackUrl(orderId, publicApi = publicApiUrl()) {
    const url = new URL(publicApi.toString());
    url.pathname = `${url.pathname.replace(/\/$/, '')}/api/payments/paytm/callback`;
    url.searchParams.set('order', String(orderId));
    return url.toString();
}

function orderAmount(order) {
    return (toPaisa(order.totalPrice) / PAISA_PER_RUPEE).toFixed(2);
}

function customerId(order, customer) {
    return String(customer?._id || customer?.id || order.user || order._id);
}

async function responseJson(response, operation) {
    const text = await response.text();
    let body;
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        body = {};
    }

    if (!response.ok) {
        throw new PaytmApiError(`${operation} failed`, { providerStatus: response.status });
    }
    return body;
}

async function paytmRequest(path, body, config = getPaytmConfig()) {
    const payload = JSON.stringify(body);
    const signature = await PaytmChecksum.generateSignature(payload, config.merchantKey);
    const response = await fetch(`${config.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
            body,
            head: { signature },
        }),
    });
    return responseJson(response, 'Paytm API request');
}

async function createPaytmCheckout({ order, customer }) {
    const config = getPaytmConfig();
    const orderId = String(order.paymentDetails.merchantOrderId);
    const body = {
        requestType: 'Payment',
        mid: config.mid,
        websiteName: config.websiteName,
        orderId,
        callbackUrl: callbackUrl(order._id, config.publicApiUrl),
        txnAmount: { value: orderAmount(order), currency: 'INR' },
        userInfo: { custId: customerId(order, customer) },
    };

    const response = await paytmRequest(
        `/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(config.mid)}&orderId=${encodeURIComponent(orderId)}`,
        body,
        config
    );
    const txnToken = response?.body?.txnToken;
    if (!txnToken) {
        const resultInfo = response?.body?.resultInfo || {};
        const detail = [resultInfo.resultCode, resultInfo.resultMsg]
            .filter(Boolean)
            .join(': ');
        throw new PaytmApiError(
            `Paytm did not return a transaction token${detail ? ` (${detail})` : ''}`
        );
    }

    return {
        checkoutScriptUrl: checkoutScriptUrl(config),
        merchantId: config.mid,
        internalOrderId: String(order._id),
        orderId,
        txnToken,
        amount: orderAmount(order),
        amountPaisa: toPaisa(order.totalPrice),
    };
}

async function getPaytmOrderStatus(orderId) {
    const config = getPaytmConfig();
    const body = { mid: config.mid, orderId: String(orderId) };
    const response = await paytmRequest('/v3/order/status', body, config);
    return response?.body || response;
}

function verifyPaytmCallback(callback) {
    const config = getPaytmConfig();
    const values = { ...(callback || {}) };
    const checksum = values.CHECKSUMHASH;
    delete values.CHECKSUMHASH;
    if (!checksum) {
        const error = new Error('Missing Paytm callback checksum');
        error.statusCode = 401;
        throw error;
    }

    if (!PaytmChecksum.verifySignature(values, config.merchantKey, checksum)) {
        const error = new Error('Invalid Paytm callback checksum');
        error.statusCode = 401;
        throw error;
    }

    return values;
}

module.exports = {
    PaytmApiError,
    PaytmConfigurationError,
    callbackUrl,
    checkoutScriptUrl,
    createPaytmCheckout,
    frontendReturnUrl,
    getPaytmConfig,
    getPaytmOrderStatus,
    isPaytmConfigured,
    merchantOrderId,
    toPaisa,
    verifyPaytmCallback,
};
