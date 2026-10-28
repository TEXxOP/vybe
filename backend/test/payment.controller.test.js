const assert = require('node:assert/strict');
const test = require('node:test');

const paymentController = require('../src/controllers/payment.controller');

function responseRecorder() {
    const result = {};
    return {
        result,
        status(code) {
            result.status = code;
            return this;
        },
        json(body) {
            result.body = body;
            return this;
        },
        redirect(code, url) {
            result.status = code;
            result.redirect = url;
            return this;
        },
    };
}

test('converts a Pine Labs browser POST return into a frontend GET redirect', () => {
    const previous = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://restoralai.com,https://www.restoralai.com';

    try {
        const response = responseRecorder();
        paymentController.handlePineLabsReturn(
            { query: { order: '66d55efed1dc5e8fcb8cac44' } },
            response
        );

        assert.equal(response.result.status, 303);
        assert.equal(
            response.result.redirect,
            'https://restoralai.com/payment/pinelabs/return?order=66d55efed1dc5e8fcb8cac44'
        );
    } finally {
        if (previous === undefined) delete process.env.FRONTEND_URL;
        else process.env.FRONTEND_URL = previous;
    }
});

test('rejects a Pine Labs return without a valid internal order ID', () => {
    const response = responseRecorder();
    paymentController.handlePineLabsReturn({ query: { order: 'not-an-order' } }, response);
    assert.equal(response.result.status, 400);
});
