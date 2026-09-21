const assert = require('node:assert/strict');
const crypto = require('crypto');
const test = require('node:test');

const {
    PineLabsConfigurationError,
    merchantOrderReference,
    toPaisa,
    verifyPineLabsWebhook,
} = require('../src/services/pinelabs.service');

function withPineLabsEnvironment(values, fn) {
    const previous = {};
    for (const [key, value] of Object.entries(values)) {
        previous[key] = process.env[key];
        process.env[key] = value;
    }
    try {
        return fn();
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

test('converts rupees to Pine Labs integer paisa', () => {
    assert.equal(toPaisa(1), 100);
    assert.equal(toPaisa(999.99), 99999);
    assert.equal(toPaisa('1200.5'), 120050);
    assert.throws(() => toPaisa(0.99), PineLabsConfigurationError);
});

test('creates a short, stable Pine Labs merchant order reference', () => {
    const reference = merchantOrderReference('66d55efed1dc5e8fcb8cac44');
    assert.equal(reference, 'VYBE-PL-66d55efed1dc5e8fcb8cac44');
    assert.ok(reference.length <= 50);
});

test('accepts only an authentic, fresh Pine Labs webhook signature', () => {
    const secret = Buffer.from('pine-labs-test-secret').toString('base64');
    const body = JSON.stringify({
        event_type: 'ORDER_PROCESSED',
        data: { order_id: 'pine-order-1' },
    });
    const webhookId = 'evt-123';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto
        .createHmac('sha256', Buffer.from(secret, 'base64'))
        .update(`${webhookId}.${timestamp}.${body}`, 'utf8')
        .digest('base64');

    withPineLabsEnvironment(
        {
            PINELABS_ENABLED: 'true',
            PINELABS_ENV: 'sandbox',
            PINELABS_CLIENT_ID: 'client-id',
            PINELABS_CLIENT_SECRET: 'client-secret',
            PINELABS_WEBHOOK_SECRET: secret,
            PINELABS_WEBHOOK_TOLERANCE_SECONDS: '300',
            FRONTEND_URL: 'https://example.test',
        },
        () => {
            assert.deepEqual(
                verifyPineLabsWebhook({
                    webhookId,
                    webhookTimestamp: timestamp,
                    webhookSignature: `v1,${signature}`,
                    rawBody: body,
                }),
                JSON.parse(body)
            );
            assert.throws(
                () =>
                    verifyPineLabsWebhook({
                        webhookId,
                        webhookTimestamp: timestamp,
                        webhookSignature: 'v1,not-a-valid-signature',
                        rawBody: body,
                    }),
                /Invalid Pine Labs webhook signature/
            );
        }
    );
});
