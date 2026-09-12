const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * Regression tests for the bug that made a signed-in customer unable to add
 * anything to their bag.
 *
 * Every cart route populates `items.product` with the projection
 * 'name images price'. The `totalStock` virtual reduced over `this.sizes`, which
 * a projection like that leaves *undefined*, and `toJSON: { virtuals: true }`
 * runs every virtual on serialisation — so `res.json()` threw
 * "Cannot read properties of undefined (reading 'reduce')" and the route
 * returned 500 *after* `cart.save()` had already committed. The item really went
 * into the cart and the customer was told it had failed.
 *
 * The same throw hit GET /api/cart, PUT /api/cart/update, DELETE
 * /api/cart/remove and GET /api/orders/:id — anything populating a product
 * without selecting `sizes`.
 *
 * These tests run without a database. Note that `Product.hydrate({...})` is NOT
 * a faithful stand-in for a projected query: it materialises the schema default
 * `[]` for an omitted array path and reports it as selected, so the bug is
 * invisible through it. Verified against the live database, a genuinely
 * projected document has `sizes === undefined` and
 * `isDirectSelected('sizes') === false`. The getters are therefore invoked
 * against the same `this` shape Mongoose gives them, which is what the virtual
 * actually has to survive.
 */

const mongoose = require('mongoose');
const Product = require('../src/models/Product.model');

const totalStock = Product.schema.virtualpath('totalStock').getters[0];
const discountPercent = Product.schema.virtualpath('discountPercent').getters[0];

/** Exactly what `.populate('items.product', 'name images price')` yields. */
const PROJECTED = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Chroma Surge Jacket',
    price: 2500,
    images: [{ url: 'https://example.test/jacket.jpg' }],
    // `sizes` and `comparePrice` are deliberately absent, not empty.
};

const FULL = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Chroma Surge Jacket',
    price: 2500,
    comparePrice: 3200,
    images: [{ url: 'https://example.test/jacket.jpg' }],
    sizes: [
        { size: 'S', stock: 10 },
        { size: 'M', stock: 15 },
        { size: 'L', stock: 12 },
        { size: 'XL', stock: 8 },
    ],
};

test('totalStock does not throw when `sizes` was not selected', () => {
    // The exact failure: res.json() -> toJSON -> this virtual, with no `sizes`.
    assert.doesNotThrow(() => totalStock.call(PROJECTED));
});

test('totalStock is undefined, not zero, when `sizes` was not selected', () => {
    // Zero would be wrong in a way that matters: the storefront renders a stock
    // count of 0 as "Sold out" (stockLeft/badgeText in LimitedEdition.jsx), so
    // reporting unloaded data as zero would mark a stocked product sold out.
    // Undefined omits the key from JSON and lets the consumer's Number.isFinite
    // guard fall through to a real source.
    assert.equal(totalStock.call(PROJECTED), undefined);
});

test('totalStock sums stock across sizes on a full document', () => {
    assert.equal(totalStock.call(FULL), 45);
});

test('an empty sizes array is genuinely zero stock, not unknown', () => {
    assert.equal(totalStock.call({ sizes: [] }), 0);
});

test('totalStock tolerates a size entry with no stock value', () => {
    assert.equal(totalStock.call({ sizes: [{ size: 'S', stock: 4 }, { size: 'M' }] }), 4);
});

test('discountPercent survives a projection that omits comparePrice', () => {
    // Already safe — it guards on comparePrice being falsy. Asserted so a future
    // edit cannot regress it into the same trap as totalStock.
    assert.equal(discountPercent.call(PROJECTED), 0);
});

test('discountPercent computes from a full document', () => {
    assert.equal(discountPercent.call(FULL), 22);
});

test('a full product document still serialises with both virtuals', () => {
    const serialised = JSON.parse(JSON.stringify(Product.hydrate(FULL)));

    assert.equal(serialised.totalStock, 45);
    assert.equal(serialised.discountPercent, 22);
});
