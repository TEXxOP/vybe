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

/* ===================================================================
 * Fulfilment: taking stock off the shelf.
 *
 * Stock was never decremented before — only soldCount moved — so the same
 * units could be sold indefinitely. These cover the decrement, its idempotency
 * under duplicate PhonePe webhooks, and the race that cannot be thrown on.
 * =================================================================== */

/**
 * A fake Product collection that honours the same conditional-update contract
 * as MongoDB: the write applies only if the matched size still holds enough
 * stock, and returns null otherwise.
 */
function fakeProducts(docs) {
    const byId = new Map(docs.map((d) => [String(d._id), d]));

    return {
        find: async () => docs,
        findOneAndUpdate: async (filter, update) => {
            const doc = byId.get(String(filter._id));
            if (!doc) return null;

            const match = filter.sizes.$elemMatch;
            const size = doc.sizes.find((s) => s.size === match.size);
            if (!size || size.stock < match.stock.$gte) return null;

            size.stock += update.$inc['sizes.$.stock'];
            doc.soldCount = (doc.soldCount || 0) + update.$inc.soldCount;
            return doc;
        },
        _byId: byId,
    };
}

/** A minimal saved-order stand-in matching what fulfilOrder reads and writes. */
function fakeOrder(items, { committed = null } = {}) {
    const order = {
        _id: 'order-1',
        user: 'user-1',
        items,
        fulfillmentCommittedAt: committed,
        fulfillmentIssues: undefined,
        saved: 0,
        async save() { this.saved += 1; },
    };
    order.constructor = { findById: async () => order };
    return order;
}

function loadServiceForFulfilment(productStub, cartDoc) {
    stubModel(CART_PATH, {
        findOne: () => ({ then: (res) => res(cartDoc), session: () => Promise.resolve(cartDoc) }),
    });
    stubModel(PRODUCT_PATH, productStub);
    delete require.cache[require.resolve('../src/services/order.service')];
    return require('../src/services/order.service');
}

test('fulfilment takes the purchased quantity out of stock', async () => {
    const products = fakeProducts([
        { _id: 'p1', name: 'Jacket', soldCount: 0, sizes: [{ size: 'S', stock: 10 }, { size: 'M', stock: 4 }] },
    ]);
    const cart = { items: [], save: async () => {} };
    const service = loadServiceForFulfilment(products, cart);

    const order = fakeOrder([
        { product: 'p1', name: 'Jacket', size: 'S', quantity: 3 },
        { product: 'p1', name: 'Jacket', size: 'M', quantity: 1 },
    ]);

    await service.fulfilOrder(order, { transactional: false });

    const doc = products._byId.get('p1');
    assert.equal(doc.sizes.find((s) => s.size === 'S').stock, 7, 'S: 10 - 3');
    assert.equal(doc.sizes.find((s) => s.size === 'M').stock, 3, 'M: 4 - 1');
    assert.equal(doc.soldCount, 4, 'both lines counted as sold');
    assert.ok(order.fulfillmentCommittedAt instanceof Date);
    assert.equal(order.fulfillmentIssues, undefined, 'a clean order records no issues');
});

test('a duplicate webhook does not decrement stock twice', async () => {
    const products = fakeProducts([
        { _id: 'p1', name: 'Jacket', soldCount: 0, sizes: [{ size: 'S', stock: 10 }] },
    ]);
    const cart = { items: [], save: async () => {} };
    const service = loadServiceForFulfilment(products, cart);

    const order = fakeOrder([{ product: 'p1', name: 'Jacket', size: 'S', quantity: 2 }]);

    await service.fulfilOrder(order, { transactional: false });
    await service.fulfilOrder(order, { transactional: false }); // PhonePe retries
    await service.fulfilOrder(order, { transactional: false });

    const doc = products._byId.get('p1');
    assert.equal(doc.sizes[0].stock, 8, 'decremented once despite three deliveries');
    assert.equal(doc.soldCount, 2);
});

test('records a shortfall instead of throwing when stock ran out', async () => {
    // Only 1 left, but the order was built for 3 — the race between checkout
    // and payment confirmation. The money is already captured at this point.
    const products = fakeProducts([
        { _id: 'p1', name: 'Jacket', soldCount: 0, sizes: [{ size: 'S', stock: 1 }] },
    ]);
    const cart = { items: [], save: async () => {} };
    const service = loadServiceForFulfilment(products, cart);

    const order = fakeOrder([{ product: 'p1', name: 'Jacket', size: 'S', quantity: 3 }]);

    // Must not throw: a paid order that cannot commit would leave the webhook
    // failing forever on a payment that genuinely succeeded.
    await service.fulfilOrder(order, { transactional: false });

    const doc = products._byId.get('p1');
    assert.equal(doc.sizes[0].stock, 1, 'stock untouched rather than driven negative');
    assert.equal(doc.soldCount, 0, 'nothing left the shelf, so nothing is counted sold');
    assert.ok(order.fulfillmentCommittedAt instanceof Date, 'order still commits');
    assert.equal(order.fulfillmentIssues.length, 1);
    assert.equal(order.fulfillmentIssues[0].reason, 'insufficient_stock_at_fulfilment');
    assert.equal(order.fulfillmentIssues[0].quantity, 3);
    assert.equal(order.fulfillmentIssues[0].size, 'S');
});

test('one unavailable line does not block the others', async () => {
    const products = fakeProducts([
        { _id: 'p1', name: 'Jacket', soldCount: 0, sizes: [{ size: 'S', stock: 5 }] },
        { _id: 'p2', name: 'Tee', soldCount: 0, sizes: [{ size: 'M', stock: 0 }] },
    ]);
    const cart = { items: [], save: async () => {} };
    const service = loadServiceForFulfilment(products, cart);

    const order = fakeOrder([
        { product: 'p1', name: 'Jacket', size: 'S', quantity: 2 },
        { product: 'p2', name: 'Tee', size: 'M', quantity: 1 },
    ]);

    await service.fulfilOrder(order, { transactional: false });

    assert.equal(products._byId.get('p1').sizes[0].stock, 3, 'available line still ships');
    assert.equal(products._byId.get('p1').soldCount, 2);
    assert.equal(order.fulfillmentIssues.length, 1);
    assert.equal(order.fulfillmentIssues[0].name, 'Tee');
});

test('stock is never driven below zero', async () => {
    const products = fakeProducts([
        { _id: 'p1', name: 'Jacket', soldCount: 0, sizes: [{ size: 'S', stock: 2 }] },
    ]);
    const cart = { items: [], save: async () => {} };
    const service = loadServiceForFulfilment(products, cart);

    // Three separate orders for the last 2 units.
    for (const qty of [2, 1, 1]) {
        await service.fulfilOrder(fakeOrder([{ product: 'p1', name: 'Jacket', size: 'S', quantity: qty }]), {
            transactional: false,
        });
    }

    const doc = products._byId.get('p1');
    assert.equal(doc.sizes[0].stock, 0, 'first order took both; the rest found none');
    assert.ok(doc.sizes[0].stock >= 0);
    assert.equal(doc.soldCount, 2, 'only the units that actually existed are counted sold');
});
