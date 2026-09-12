const {
    Env,
    MetaInfo,
    StandardCheckoutClient,
    StandardCheckoutPayRequest,
} = require('@phonepe-pg/pg-sdk-node');

const DEFAULT_EXPIRY_SECONDS = 20 * 60;
const PAISA_PER_RUPEE = 100;

let client;
let clientConfigFingerprint;

class PhonePeConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PhonePeConfigurationError';
        this.statusCode = 503;
    }
}

function phonePeEnvironment() {
    const configured = (process.env.PHONEPE_ENV || 'sandbox').toLowerCase();
    if (configured === 'sandbox') return Env.SANDBOX;
    if (configured === 'production') return Env.PRODUCTION;
    throw new PhonePeConfigurationError('PHONEPE_ENV must be either sandbox or production');
}

function baseFrontendUrl() {
    const configured = process.env.FRONTEND_URL;
    if (!configured) {
        throw new PhonePeConfigurationError('FRONTEND_URL is required for the PhonePe return URL');
    }

    try {
        const url = new URL(configured.split(',')[0].trim());
        if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
            throw new Error('Production return URL must use HTTPS');
        }
        return url;
    } catch {
        throw new PhonePeConfigurationError('FRONTEND_URL must be an absolute URL');
    }
}

function getPhonePeConfig() {
    if (String(process.env.PHONEPE_ENABLED).toLowerCase() !== 'true') {
        throw new PhonePeConfigurationError('PhonePe payments are not configured yet');
    }

    const config = {
        clientId: process.env.PHONEPE_CLIENT_ID,
        clientSecret: process.env.PHONEPE_CLIENT_SECRET,
        clientVersion: process.env.PHONEPE_CLIENT_VERSION,
        environment: phonePeEnvironment(),
        webhookUsername: process.env.PHONEPE_WEBHOOK_USERNAME,
        webhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD,
        expirySeconds: Number(process.env.PHONEPE_PAYMENT_EXPIRY_SECONDS || DEFAULT_EXPIRY_SECONDS),
        frontendUrl: baseFrontendUrl(),
    };

    const missing = ['clientId', 'clientSecret', 'clientVersion'].filter((key) => !config[key]);
    if (missing.length > 0) {
        throw new PhonePeConfigurationError('PhonePe credentials are incomplete');
    }

    if (!Number.isInteger(config.expirySeconds) || config.expirySeconds < 60 || config.expirySeconds > 3600) {
        throw new PhonePeConfigurationError(
            'PHONEPE_PAYMENT_EXPIRY_SECONDS must be between 60 and 3600 seconds'
        );
    }

    return config;
}

function isPhonePeConfigured() {
    try {
        getPhonePeConfig();
        return true;
    } catch {
        return false;
    }
}

function getPhonePeClient(config = getPhonePeConfig()) {
    const fingerprint = [
        config.clientId,
        config.clientSecret,
        config.clientVersion,
        config.environment,
    ].join(':');

    if (client && clientConfigFingerprint !== fingerprint) {
        throw new PhonePeConfigurationError('PhonePe configuration changed; restart the server');
    }

    if (!client) {
        client = StandardCheckoutClient.getInstance(
            config.clientId,
            config.clientSecret,
            config.clientVersion,
            config.environment
        );
        clientConfigFingerprint = fingerprint;
    }

    return client;
}

function toPaisa(amountInRupees) {
    const paisa = Math.round(Number(amountInRupees) * PAISA_PER_RUPEE);
    if (!Number.isSafeInteger(paisa) || paisa < 100) {
        throw new PhonePeConfigurationError('Order total must be at least ₹1.00');
    }
    return paisa;
}

function merchantOrderId(orderId) {
    // A Mongo ObjectId is URL-safe and this stays well below PhonePe's 63-char limit.
    return `VYBE-${String(orderId)}`;
}

function paymentReturnUrl(orderId, frontendUrl) {
    const url = new URL(frontendUrl.toString());
    url.pathname = `${url.pathname.replace(/\/$/, '')}/payment/phonepe/return`;
    url.searchParams.set('order', String(orderId));
    return url.toString();
}

async function createPhonePeCheckout({ order }) {
    const config = getPhonePeConfig();
    const request = StandardCheckoutPayRequest.builder()
        .merchantOrderId(order.paymentDetails.merchantOrderId)
        .amount(toPaisa(order.totalPrice))
        .redirectUrl(paymentReturnUrl(order._id, config.frontendUrl))
        .message(`Payment for ${order.orderNumber}`)
        .expireAfter(config.expirySeconds)
        .disablePaymentRetry(false)
        .metaInfo(
            MetaInfo.builder()
                .udf1(String(order._id))
                .udf2(order.orderNumber)
                .build()
        )
        .build();

    const response = await getPhonePeClient(config).pay(request);
    if (!response?.redirectUrl) {
        throw new Error('PhonePe did not return a checkout URL');
    }

    return {
        checkoutUrl: response.redirectUrl,
        amountPaisa: toPaisa(order.totalPrice),
        expiresAt: new Date(Date.now() + config.expirySeconds * 1000),
    };
}

async function getPhonePeOrderStatus(merchantId) {
    return getPhonePeClient().getOrderStatus(merchantId, true);
}

function verifyPhonePeWebhook({ authorization, rawBody }) {
    const config = getPhonePeConfig();
    if (!config.webhookUsername || !config.webhookPassword) {
        throw new PhonePeConfigurationError('PhonePe webhook credentials are incomplete');
    }
    if (!authorization || !rawBody) {
        const error = new Error('Missing PhonePe webhook authorization or body');
        error.statusCode = 401;
        throw error;
    }

    return getPhonePeClient(config).validateCallback(
        config.webhookUsername,
        config.webhookPassword,
        authorization,
        rawBody
    );
}

module.exports = {
    PhonePeConfigurationError,
    createPhonePeCheckout,
    getPhonePeOrderStatus,
    isPhonePeConfigured,
    merchantOrderId,
    toPaisa,
    verifyPhonePeWebhook,
};
