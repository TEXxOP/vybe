const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

/**
 * These tests cover the bug that charged ₹14,396 against a checkout screen
 * reading ₹2,950: the server rebuilt the total from its own cart and never
 * checked it against the figure the customer had agreed to.
 *
 * order.service pulls in the Cart and Product Mongoose models, which would
 * otherwise need a live database. We stub the two model modules in the require
 * cache instead, so the pricing and agreement logic can be tested in isolation.
 */

const CART_PATH = require.resolve('../src/models/Cart.model');
const PRODUCT_PATH = require.resolve('../src/models/Product.model');

function stubModel(path, exports) {
    const stub = new Module(path, null);
    stub.filename = path;
    stub.loaded = true;
    stub.exports = exports;
    require.cache[path] = stub;
}

const ADDRESS = {
    name: 'Test Buyer',
    street: '1 Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '9876543210',
};

/** The jacket from the real order, at the real price. */
function jacket(id, price = 2500) {
    return {
        _id: id,
        id,
        name: `Jacket ${id}`,
        price,
        sizes: [{ size: 'S', stock: 20 }, { size: 'M', stock: 20 }],
        images: [{ url: `https://example.test/${id}.jpg` }],
    };
}

/**
 * Install a fake cart/catalogue pair and return a fresh order.service bound to
 * it. `cartItems` mirrors the shape Cart.findOne(...).populate(...) resolves to.
 */
function loadServiceWith(cartItems, products) {
    stubModel(CART_PATH, {
        findOne: () => ({
            populate: async () => ({ items: cartItems }),
        }),
    });
    stubModel(PRODUCT_PATH, {
        find: async () => products,
    });

    delete require.cache[require.resolve('../src/services/order.service')];
    return require('../src/services/order.service');
}

test('builds the order total from the server cart, not the browser', async () => {
    const service = loadServiceWith(
        [{ product: jacket('a'), quantity: 1, size: 'S', color: 'Black' }],
        [jacket('a')]
    );

    const order = await service.buildOrderFromCart('user-1', ADDRESS);

    // 2500 subtotal, free shipping (>= 999), 18% GST = 450.
    assert.equal(order.itemsPrice, 2500);
    assert.equal(order.shippingPrice, 0);
    assert.equal(order.taxPrice, 450);
    assert.equal(order.totalPrice, 2950);
});

test('accepts an expected total that matches the server figure', async () => {
    const service = loadServiceWith(
        [{ product: jacket('a'), quantity: 1, size: 'S', color: 'Black' }],
        [jacket('a')]
    );

    const order = await service.buildOrderFromCart('user-1', ADDRESS, {
        expectedTotal: 2950,
    });

    assert.equal(order.totalPrice, 2950);
});

test('refuses to charge a total the customer was never shown', async () => {
    // The exact divergence from the live order: the browser rendered one
    // jacket (2950) while the server cart held five units across three lines
    // (12200 + 2196 GST = 14396).
    const canvas = jacket('canvas', 2400);
    const chroma = jacket('chroma', 2500);
    const service = loadServiceWith(
        [
            { product: canvas, quantity: 2, size: 'S', color: 'Black' },
            { product: canvas, quantity: 1, size: 'M', color: 'Black' },
            { product: chroma, quantity: 2, size: 'S', color: 'Black' },
        ],
        [canvas, chroma]
    );

    // Without agreement, the old behaviour: it happily builds 14396.
    const unchecked = await service.buildOrderFromCart('user-1', ADDRESS);
    assert.equal(unchecked.totalPrice, 14396);

    // With it, the order is refused rather than silently repriced.
    await assert.rejects(
        () => service.buildOrderFromCart('user-1', ADDRESS, { expectedTotal: 2950 }),
        (error) => {
            assert.equal(error.name, 'CartChangedError');
            assert.equal(error.statusCode, 409);
            assert.ok(error instanceof service.OrderValidationError,
                'must subclass OrderValidationError so controllers surface the message');
            assert.match(error.message, /2950/);
            return true;
        }
    );
});

test('rejects a non-numeric expected total instead of ignoring it', async () => {
    const service = loadServiceWith(
        [{ product: jacket('a'), quantity: 1, size: 'S', color: 'Black' }],
        [jacket('a')]
    );

    for (const bad of ['not-a-number', NaN, Infinity, {}]) {
        await assert.rejects(
            () => service.buildOrderFromCart('user-1', ADDRESS, { expectedTotal: bad }),
            (error) => {
                assert.equal(error.statusCode, 400);
                return true;
            },
            `expectedTotal ${String(bad)} should be refused`
        );
    }
});

test('omitting the expected total leaves existing callers working', async () => {
    const service = loadServiceWith(
        [{ product: jacket('a'), quantity: 1, size: 'S', color: 'Black' }],
        [jacket('a')]
    );

    for (const options of [undefined, {}, { expectedTotal: undefined }, { expectedTotal: null }]) {
        const order = await service.buildOrderFromCart('user-1', ADDRESS, options);
        assert.equal(order.totalPrice, 2950);
    }
});

test('adds flat shipping below the free-shipping threshold', async () => {
    const tee = jacket('tee', 500);
    const service = loadServiceWith(
        [{ product: tee, quantity: 1, size: 'S', color: 'Black' }],
        [tee]
    );

    // 500 + 99 shipping + 90 GST. GST is charged on the goods, not the postage.
    const order = await service.buildOrderFromCart('user-1', ADDRESS, {
        expectedTotal: 689,
    });

    assert.equal(order.shippingPrice, 99);
    assert.equal(order.totalPrice, 689);
});
