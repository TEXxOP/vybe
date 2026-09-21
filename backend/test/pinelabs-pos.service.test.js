const assert = require('node:assert/strict');
const test = require('node:test');

const {
    PineLabsPosConfigurationError,
    buildTransactionSummaryRequest,
    normaliseTransactionSummaryQuery,
    redactPineLabsReport,
} = require('../src/services/pinelabs-pos.service');

function withEnvironment(values, fn) {
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

test('normalises a bounded Pine Labs POS transaction-summary query', () => {
    assert.deepEqual(
        normaliseTransactionSummaryQuery({
            fromDate: '2026-06-30T00:00:00',
            toDate: '2026-08-04T00:00:00',
            page: '2',
            size: '250',
        }),
        {
            fromDate: '2026-06-30T00:00:00',
            toDate: '2026-08-04T00:00:00',
            page: 2,
            size: 250,
        }
    );
    assert.throws(
        () => normaliseTransactionSummaryQuery({ fromDate: 'not-a-date', toDate: '2026-08-04T00:00:00' }),
        /fromDate must be a valid ISO-8601 date\/time/
    );
    assert.throws(
        () => normaliseTransactionSummaryQuery({ fromDate: '2026-08-05T00:00:00', toDate: '2026-08-04T00:00:00' }),
        /fromDate must be before or equal to toDate/
    );
});

test('builds Pine Labs POS Basic authentication only in a server request', () => {
    withEnvironment(
        {
            PINELABS_POS_REPORTING_ENABLED: 'true',
            PINELABS_POS_CLIENT_ID: 'example-client-id',
            PINELABS_POS_CLIENT_SECRET: 'example-client-secret',
        },
        () => {
            const request = buildTransactionSummaryRequest({
                fromDate: '2026-06-30T00:00:00',
                toDate: '2026-08-04T00:00:00',
                page: 0,
                size: 100,
            });
            assert.equal(request.url.toString(), 'https://api-c.pinelabs.com/transactions/summary?page=0&size=100');
            assert.equal(request.options.method, 'GET');
            assert.equal(request.options.headers.Authorization, 'Basic ZXhhbXBsZS1jbGllbnQtaWQ6ZXhhbXBsZS1jbGllbnQtc2VjcmV0');
            assert.deepEqual(JSON.parse(request.body), {
                fromDate: '2026-06-30T00:00:00',
                toDate: '2026-08-04T00:00:00',
            });
        }
    );
    assert.throws(() => buildTransactionSummaryRequest({}), PineLabsPosConfigurationError);
});

test('redacts credential and PAN-like fields before returning a POS report', () => {
    assert.deepEqual(
        redactPineLabsReport({
            transactionId: 'txn-1',
            authorization: 'not-for-the-browser',
            cardNumber: '4111 1111 1111 1111',
            nested: { reference: '1234567890123456' },
        }),
        {
            transactionId: 'txn-1',
            authorization: '[redacted]',
            cardNumber: '[redacted]',
            nested: { reference: '[redacted]' },
        }
    );
});
