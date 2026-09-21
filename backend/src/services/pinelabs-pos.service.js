const https = require('https');

const DEFAULT_API_BASE_URL = 'https://api-c.pinelabs.com';
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_PAGE_SIZE = 1_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

class PineLabsPosConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PineLabsPosConfigurationError';
        this.statusCode = 503;
    }
}

class PineLabsPosApiError extends Error {
    constructor(message, { statusCode = 502, providerStatus } = {}) {
        super(message);
        this.name = 'PineLabsPosApiError';
        this.statusCode = statusCode;
        this.providerStatus = providerStatus;
    }
}

function getPineLabsPosConfig() {
    if (String(process.env.PINELABS_POS_REPORTING_ENABLED).toLowerCase() !== 'true') {
        throw new PineLabsPosConfigurationError('Pine Labs POS reporting is not configured yet');
    }

    const clientId = String(process.env.PINELABS_POS_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.PINELABS_POS_CLIENT_SECRET || '').trim();
    if (!clientId || !clientSecret) {
        throw new PineLabsPosConfigurationError('Pine Labs POS reporting credentials are incomplete');
    }

    let baseUrl;
    try {
        baseUrl = new URL(process.env.PINELABS_POS_API_BASE_URL || DEFAULT_API_BASE_URL);
    } catch {
        throw new PineLabsPosConfigurationError('PINELABS_POS_API_BASE_URL must be an absolute URL');
    }
    if (baseUrl.protocol !== 'https:') {
        throw new PineLabsPosConfigurationError('PINELABS_POS_API_BASE_URL must use HTTPS');
    }

    const timeoutMs = Number(process.env.PINELABS_POS_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new PineLabsPosConfigurationError(
            `PINELABS_POS_REQUEST_TIMEOUT_MS must be between 1000 and ${MAX_TIMEOUT_MS}`
        );
    }

    return { baseUrl, clientId, clientSecret, timeoutMs };
}

function isPineLabsPosConfigured() {
    try {
        getPineLabsPosConfig();
        return true;
    } catch {
        return false;
    }
}

function requiredIsoDate(value, name) {
    const date = String(value || '').trim();
    if (!date || !Number.isFinite(Date.parse(date))) {
        const error = new Error(`${name} must be a valid ISO-8601 date/time`);
        error.statusCode = 400;
        throw error;
    }
    return date;
}

function integerInRange(value, { name, minimum, maximum, fallback }) {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
        const error = new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
        error.statusCode = 400;
        throw error;
    }
    return parsed;
}

function normaliseTransactionSummaryQuery(query = {}) {
    const fromDate = requiredIsoDate(query.fromDate, 'fromDate');
    const toDate = requiredIsoDate(query.toDate, 'toDate');
    if (Date.parse(fromDate) > Date.parse(toDate)) {
        const error = new Error('fromDate must be before or equal to toDate');
        error.statusCode = 400;
        throw error;
    }

    return {
        fromDate,
        toDate,
        page: integerInRange(query.page, { name: 'page', minimum: 0, maximum: 100_000, fallback: 0 }),
        size: integerInRange(query.size, { name: 'size', minimum: 1, maximum: MAX_PAGE_SIZE, fallback: 100 }),
    };
}

/* Pine Labs provided this endpoint as GET with a JSON request body. `fetch`
 * intentionally refuses that non-standard combination, so this integration
 * uses Node's lower-level HTTPS client and sends exactly the supplied shape. */
function buildTransactionSummaryRequest(summaryQuery, config = getPineLabsPosConfig()) {
    const url = new URL('/transactions/summary', config.baseUrl);
    url.searchParams.set('page', String(summaryQuery.page));
    url.searchParams.set('size', String(summaryQuery.size));

    const body = JSON.stringify({
        fromDate: summaryQuery.fromDate,
        toDate: summaryQuery.toDate,
    });
    const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`, 'utf8').toString('base64');

    return {
        url,
        body,
        options: {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                Authorization: `Basic ${basicAuth}`,
            },
            timeout: config.timeoutMs,
        },
    };
}

function requestJson({ url, body, options }) {
    return new Promise((resolve, reject) => {
        const request = https.request(url, options, (response) => {
            const chunks = [];
            let bytesReceived = 0;

            response.on('data', (chunk) => {
                bytesReceived += chunk.length;
                if (bytesReceived > MAX_RESPONSE_BYTES) {
                    request.destroy(new PineLabsPosApiError('Pine Labs POS report was too large'));
                    return;
                }
                chunks.push(chunk);
            });
            response.on('end', () => {
                const rawBody = Buffer.concat(chunks).toString('utf8');
                let payload;
                try {
                    payload = rawBody ? JSON.parse(rawBody) : {};
                } catch {
                    return reject(new PineLabsPosApiError('Pine Labs POS returned invalid JSON'));
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    return reject(
                        new PineLabsPosApiError('Pine Labs POS transaction summary request failed', {
                            providerStatus: response.statusCode,
                        })
                    );
                }
                return resolve(payload);
            });
        });

        request.on('timeout', () => {
            request.destroy(new PineLabsPosApiError('Pine Labs POS transaction summary request timed out'));
        });
        request.on('error', (error) => {
            reject(
                error instanceof PineLabsPosApiError
                    ? error
                    : new PineLabsPosApiError('Could not reach Pine Labs POS reporting')
            );
        });
        request.write(body);
        request.end();
    });
}

async function getPineLabsTransactionSummary(query) {
    const summaryQuery = normaliseTransactionSummaryQuery(query);
    const request = buildTransactionSummaryRequest(summaryQuery);
    const report = await requestJson(request);
    return { summaryQuery, report };
}

/* The provider's report schema is not published with the credentials. Do not
 * pass accidental secrets or full PAN-like values through the admin API while
 * retaining ordinary transaction fields for reconciliation. */
function redactPineLabsReport(value, depth = 0) {
    if (depth > 20) return '[truncated]';
    if (Array.isArray(value)) return value.map((item) => redactPineLabsReport(item, depth + 1));
    if (!value || typeof value !== 'object') {
        if (
            typeof value === 'string' &&
            /(?:\d[ -]?){13,19}/.test(value.replace(/\D/g, '').slice(0, 19))
        ) {
            return '[redacted]';
        }
        return value;
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => {
            const sensitive = /(?:secret|password|authorization|token|cvv|\bpin\b|card.?number|\bpan\b|track.?data)/i;
            return [key, sensitive.test(key) ? '[redacted]' : redactPineLabsReport(nestedValue, depth + 1)];
        })
    );
}

module.exports = {
    PineLabsPosApiError,
    PineLabsPosConfigurationError,
    buildTransactionSummaryRequest,
    getPineLabsPosConfig,
    getPineLabsTransactionSummary,
    isPineLabsPosConfigured,
    normaliseTransactionSummaryQuery,
    redactPineLabsReport,
};
