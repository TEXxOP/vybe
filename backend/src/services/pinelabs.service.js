const crypto = require('crypto');

const PAISA_PER_RUPEE = 100;
const MIN_AMOUNT_PAISA = 100;
const TOKEN_EXPIRY_SAFETY_MS = 60 * 1000;
const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

const BASE_URLS = {
    sandbox: 'https://pluraluat.v2.pinepg.in',
    production: 'https://api.pluralpay.in',
};

let accessToken;
let accessTokenExpiresAt = 0;
let tokenConfigFingerprint;

class PineLabsConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PineLabsConfigurationError';
        this.statusCode = 503;
    }
}

class PineLabsApiError extends Error {
    constructor(message, { statusCode = 502, providerStatus } = {}) {
        super(message);
        this.name = 'PineLabsApiError';
        this.statusCode = statusCode;
        this.providerStatus = providerStatus;
    }
}

function pineLabsEnvironment() {
    const environment = String(process.env.PINELABS_ENV || 'sandbox').toLowerCase();
    if (environment === 'sandbox' || environment === 'production') return environment;
    throw new PineLabsConfigurationError('PINELABS_ENV must be either sandbox or production');
}

function frontendUrl() {
    const configured = process.env.FRONTEND_URL;
    if (!configured) {
        throw new PineLabsConfigurationError('FRONTEND_URL is required for the Pine Labs return URL');
    }

    try {
        const url = new URL(configured.split(',')[0].trim());
        if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
            throw new Error('Production return URL must use HTTPS');
        }
        return url;
    } catch {
        throw new PineLabsConfigurationError('FRONTEND_URL must be an absolute URL');
    }
}

function allowedPaymentMethods() {
    const methods = String(process.env.PINELABS_ALLOWED_PAYMENT_METHODS || 'UPI,CARD,NETBANKING')
        .split(',')
        .map((method) => method.trim().toUpperCase())
        .filter(Boolean);

    const supported = new Set([
        'CARD',
        'UPI',
        'POINTS',
        'NETBANKING',
        'WALLET',
        'CREDIT_EMI',
        'DEBIT_EMI',
        'BNPL',
    ]);

    if (methods.length === 0 || methods.some((method) => !supported.has(method))) {
        throw new PineLabsConfigurationError('PINELABS_ALLOWED_PAYMENT_METHODS contains an unsupported method');
    }

    return methods;
}

function webhookSecretBytes(secret) {
    if (!secret || !/^[A-Za-z0-9+/]+={0,2}$/.test(secret) || secret.length % 4 !== 0) {
        throw new PineLabsConfigurationError('PINELABS_WEBHOOK_SECRET must be a Base64-encoded secret');
    }

    const decoded = Buffer.from(secret, 'base64');
    if (decoded.length === 0 || decoded.toString('base64') !== secret) {
        throw new PineLabsConfigurationError('PINELABS_WEBHOOK_SECRET must be a valid Base64-encoded secret');
    }

    return decoded;
}

function getPineLabsConfig() {
    if (String(process.env.PINELABS_ENABLED).toLowerCase() !== 'true') {
        throw new PineLabsConfigurationError('Pine Labs payments are not configured yet');
    }

    const environment = pineLabsEnvironment();
    const config = {
        environment,
        baseUrl: String(process.env.PINELABS_API_BASE_URL || BASE_URLS[environment]).replace(/\/+$/, ''),
        clientId: process.env.PINELABS_CLIENT_ID,
        clientSecret: process.env.PINELABS_CLIENT_SECRET,
        webhookSecret: process.env.PINELABS_WEBHOOK_SECRET,
        webhookToleranceSeconds: Number(
            process.env.PINELABS_WEBHOOK_TOLERANCE_SECONDS || DEFAULT_WEBHOOK_TOLERANCE_SECONDS
        ),
        allowedPaymentMethods: allowedPaymentMethods(),
        frontendUrl: frontendUrl(),
    };

    const missing = ['clientId', 'clientSecret', 'webhookSecret'].filter((key) => !config[key]);
    if (missing.length > 0) {
        throw new PineLabsConfigurationError('Pine Labs credentials are incomplete');
    }
    webhookSecretBytes(config.webhookSecret);

    if (
        !Number.isInteger(config.webhookToleranceSeconds) ||
        config.webhookToleranceSeconds < 30 ||
        config.webhookToleranceSeconds > 3600
    ) {
        throw new PineLabsConfigurationError(
            'PINELABS_WEBHOOK_TOLERANCE_SECONDS must be between 30 and 3600 seconds'
        );
    }

    return config;
}

function isPineLabsConfigured() {
    try {
        getPineLabsConfig();
        return true;
    } catch {
        return false;
    }
}

function toPaisa(amountInRupees) {
    const paisa = Math.round(Number(amountInRupees) * PAISA_PER_RUPEE);
    if (!Number.isSafeInteger(paisa) || paisa < MIN_AMOUNT_PAISA) {
        throw new PineLabsConfigurationError('Order total must be at least ₹1.00');
    }
    return paisa;
}

function merchantOrderReference(orderId) {
    // Pine Labs permits merchant_order_reference values up to 50 characters.
    return `VYBE-PL-${String(orderId)}`;
}

function paymentReturnUrl(orderId, baseUrl) {
    const url = new URL(baseUrl.toString());
    url.pathname = `${url.pathname.replace(/\/$/, '')}/payment/pinelabs/return`;
    url.searchParams.set('order', String(orderId));
    return url.toString();
}

function names(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || 'Customer',
        lastName: parts.slice(1).join(' ') || 'Customer',
    };
}

function customerDetails(order, customer) {
    const address = order.shippingAddress || {};
    const { firstName, lastName } = names(address.name);
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const location = {
        address1: String(address.street || '').trim(),
        pincode: String(address.pincode || '').trim(),
        city: String(address.city || '').trim(),
        state: String(address.state || '').trim(),
        country: String(address.country || 'India').trim(),
        full_name: fullName,
    };

    return {
        email_id: String(customer?.email || '').trim(),
        first_name: firstName,
        last_name: lastName,
        customer_id: String(customer?._id || customer?.id || order.user || ''),
        mobile_number: String(address.phone || '').replace(/\D/g, ''),
        country_code: '91',
        billing_address: { ...location, address_category: 'billing' },
        shipping_address: { ...location, address_category: 'shipping' },
    };
}

function tokenFingerprint(config) {
    return [config.baseUrl, config.clientId, config.clientSecret].join(':');
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
        throw new PineLabsApiError(`${operation} failed`, { providerStatus: response.status });
    }
    return body;
}

function requestHeaders(token) {
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Request-ID': crypto.randomUUID(),
        'Request-Timestamp': new Date().toISOString(),
    };
}

async function getAccessToken(config = getPineLabsConfig()) {
    const fingerprint = tokenFingerprint(config);
    if (tokenConfigFingerprint && tokenConfigFingerprint !== fingerprint) {
        throw new PineLabsConfigurationError('Pine Labs configuration changed; restart the server');
    }
    tokenConfigFingerprint = fingerprint;

    if (accessToken && Date.now() < accessTokenExpiresAt - TOKEN_EXPIRY_SAFETY_MS) {
        return accessToken;
    }

    const response = await fetch(`${config.baseUrl}/api/auth/v1/token`, {
        method: 'POST',
        headers: requestHeaders(),
        body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: 'client_credentials',
        }),
    });
    const body = await responseJson(response, 'Pine Labs access-token request');
    if (!body?.access_token || !body?.expires_at) {
        throw new PineLabsApiError('Pine Labs returned an incomplete access-token response');
    }

    const expiresAt = Date.parse(body.expires_at);
    if (!Number.isFinite(expiresAt)) {
        throw new PineLabsApiError('Pine Labs returned an invalid access-token expiry');
    }

    accessToken = body.access_token;
    accessTokenExpiresAt = expiresAt;
    return accessToken;
}

async function pineLabsRequest(path, options = {}, config = getPineLabsConfig()) {
    const token = await getAccessToken(config);
    const response = await fetch(`${config.baseUrl}${path}`, {
        ...options,
        headers: {
            ...requestHeaders(token),
            ...(options.headers || {}),
        },
    });
    return responseJson(response, 'Pine Labs API request');
}

async function createPineLabsCheckout({ order, customer }) {
    const config = getPineLabsConfig();
    const callbackUrl = paymentReturnUrl(order._id, config.frontendUrl);
    const response = await pineLabsRequest(
        '/api/checkout/v1/orders',
        {
            method: 'POST',
            body: JSON.stringify({
                merchant_order_reference: order.paymentDetails.merchantOrderId,
                order_amount: { value: toPaisa(order.totalPrice), currency: 'INR' },
                integration_mode: 'REDIRECT',
                pre_auth: false,
                allowed_payment_methods: config.allowedPaymentMethods,
                notes: `Payment for ${order.orderNumber}`,
                callback_url: callbackUrl,
                failure_callback_url: callbackUrl,
                purchase_details: { customer: customerDetails(order, customer) },
            }),
        },
        config
    );

    if (!response?.redirect_url || !response?.order_id) {
        throw new PineLabsApiError('Pine Labs did not return a checkout URL');
    }

    return {
        checkoutUrl: response.redirect_url,
        pineLabsOrderId: response.order_id,
        checkoutToken: response.token,
        amountPaisa: toPaisa(order.totalPrice),
    };
}

async function getPineLabsOrderStatus(pineLabsOrderId) {
    if (!pineLabsOrderId) {
        throw new PineLabsApiError('Pine Labs order ID is missing');
    }
    const response = await pineLabsRequest(`/api/pay/v1/orders/${encodeURIComponent(pineLabsOrderId)}`);
    if (!response?.data?.order_id) {
        throw new PineLabsApiError('Pine Labs returned an incomplete order-status response');
    }
    return response.data;
}

function webhookSignatureCandidates(signatureHeader) {
    return String(signatureHeader || '')
        .split(/\s+/)
        .flatMap((entry) => entry.split(';'))
        .map((entry) => entry.trim())
        .filter((entry) => entry.startsWith('v1,'))
        .map((entry) => entry.slice(3))
        .filter(Boolean);
}

function timingSafeMatch(expected, received) {
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(received, 'utf8');
    return (
        expectedBuffer.length === receivedBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    );
}

function verifyPineLabsWebhook({ webhookId, webhookTimestamp, webhookSignature, rawBody }) {
    const config = getPineLabsConfig();
    if (!webhookId || !webhookTimestamp || !webhookSignature || !rawBody) {
        const error = new Error('Missing Pine Labs webhook authentication data');
        error.statusCode = 401;
        throw error;
    }

    const timestamp = Number(webhookTimestamp);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > config.webhookToleranceSeconds) {
        const error = new Error('Pine Labs webhook timestamp is outside the accepted window');
        error.statusCode = 401;
        throw error;
    }

    const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecretBytes(config.webhookSecret))
        .update(signedContent, 'utf8')
        .digest('base64');
    const valid = webhookSignatureCandidates(webhookSignature).some((signature) =>
        timingSafeMatch(expectedSignature, signature)
    );

    if (!valid) {
        const error = new Error('Invalid Pine Labs webhook signature');
        error.statusCode = 401;
        throw error;
    }

    try {
        return JSON.parse(rawBody);
    } catch {
        const error = new Error('Invalid Pine Labs webhook JSON');
        error.statusCode = 400;
        throw error;
    }
}

module.exports = {
    PineLabsApiError,
    PineLabsConfigurationError,
    createPineLabsCheckout,
    getPineLabsConfig,
    getPineLabsOrderStatus,
    isPineLabsConfigured,
    merchantOrderReference,
    paymentReturnUrl,
    toPaisa,
    verifyPineLabsWebhook,
};
