const assert = require('node:assert/strict');
const test = require('node:test');

const {
    PhonePeConfigurationError,
    merchantOrderId,
    toPaisa,
} = require('../src/services/phonepe.service');

test('converts rupees to the exact integer paisa amount PhonePe expects', () => {
    assert.equal(toPaisa(1), 100);
    assert.equal(toPaisa(999.99), 99999);
    assert.equal(toPaisa('1200.5'), 120050);
});

test('rejects payment amounts below PhonePe Standard Checkout minimum', () => {
    assert.throws(
        () => toPaisa(0.99),
        PhonePeConfigurationError
    );
});

test('creates a short, stable merchant order ID from our internal order ID', () => {
    const id = '66d55efed1dc5e8fcb8cac44';
    const merchantId = merchantOrderId(id);

    assert.equal(merchantId, `VYBE-${id}`);
    assert.match(merchantId, /^[A-Za-z0-9_-]{1,63}$/);
});
