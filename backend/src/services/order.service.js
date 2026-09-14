const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const mongoose = require('mongoose');

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_PRICE = 99;

/**
 * GST is INCLUSIVE of the listed price, not added at checkout.
 *
 * It used to be charged on top (`Math.round(itemsPrice * 0.18)` added into the
 * total), which meant a ₹2,500 jacket became ₹2,950 at the payment step. The
 * support pages had always described it the other way — "included in the figure
 * we confirm with you and itemised so you can see it rather than infer it" — so
 * the storefront was contradicting its own policy, and the customer only found
 * out at the last screen.
 *
 * `TAX_RATE` is therefore no longer a multiplier on the total. It is only used
 * to derive the tax *component* already sitting inside the price, because an
 * Indian tax invoice has to state the GST separately. The component is
 * `price * rate / (1 + rate)` — the standard way of backing tax out of an
 * inclusive figure — and it is recorded on the order for the invoice without
 * ever being added to what the customer pays.
 */
const TAX_RATE = 0.18;

/** The GST already contained in an inclusive amount. Never additive. */
function includedTax(inclusiveAmount, rate = TAX_RATE) {
    return Math.round((inclusiveAmount * rate) / (1 + rate));
}

class OrderValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'OrderValidationError';
        this.statusCode = 400;
    }
}

/**
 * The server's total and the total the customer was shown disagree.
 *
 * Subclasses OrderValidationError so both controllers' existing
 * `instanceof OrderValidationError` branches surface the message rather than a
 * generic 500; 409 Conflict is the accurate status, since nothing about the
 * request is malformed — the bag simply changed underneath it.
 */
class CartChangedError extends OrderValidationError {
    constructor(message) {
        super(message);
        this.name = 'CartChangedError';
        this.statusCode = 409;
    }
}

function validateShippingAddress(address) {
    const required = ['name', 'street', 'city', 'state', 'pincode', 'phone'];

    if (!address || required.some((field) => !String(address[field] || '').trim())) {
        throw new OrderValidationError('Please provide complete shipping address');
    }
}

/**
 * Build an order from the current catalogue, not from the price stored when an
 * item was added to the cart. A payment request must always use a server-side,
 * current price; the browser is never an authority for money.
 *
 * `expectedTotal` is the figure the customer actually saw on the Place-order
 * button. The browser is still not trusted to *set* the price — the server
 * computes it either way — but a customer must never be charged a number they
 * were never shown. If the two disagree the order is refused, and the customer
 * is sent back to a re-fetched bag to agree to the new figure.
 *
 * This is not hypothetical: an order was charged ₹14,396 against a screen
 * reading ₹2,950, because a failed cart re-fetch after login left the browser
 * rendering a stale one-item bag while the server cart held five units. The
 * provider-amount check in payment.controller could not catch it — it compares
 * PhonePe against the order record, and the order record was already wrong.
 */
async function buildOrderFromCart(userId, shippingAddress, { expectedTotal } = {}) {
    validateShippingAddress(shippingAddress);

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
        throw new OrderValidationError('Cart is empty');
    }

    const productIds = cart.items.map((item) => item.product?._id || item.product);
    const products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    const items = cart.items.map((item) => {
        const productId = String(item.product?._id || item.product);
        const product = productsById.get(productId);

        if (!product) {
            throw new OrderValidationError('One of the items in your cart is no longer available');
        }

        const size = product.sizes.find((entry) => entry.size === item.size);
        if (!size || size.stock < item.quantity) {
            throw new OrderValidationError(`${product.name} is no longer available in the selected size`);
        }

        return {
            product: product._id,
            name: product.name,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            price: product.price,
            image: product.images[0]?.url,
        };
    });

    const itemsPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingPrice = itemsPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICE;
    // Already inside itemsPrice — recorded for the invoice, not charged on top.
    const taxPrice = includedTax(itemsPrice);
    const totalPrice = itemsPrice + shippingPrice;

    // Compared as integers: every component above is already whole rupees, and
    // an exact === on floats would be a latent rounding bug waiting for the day
    // a price stops being round.
    if (expectedTotal !== undefined && expectedTotal !== null) {
        const shown = Math.round(Number(expectedTotal));

        if (!Number.isSafeInteger(shown)) {
            throw new OrderValidationError('Could not confirm the order total. Please reload your bag and try again.');
        }

        if (shown !== Math.round(totalPrice)) {
            throw new CartChangedError(
                'Your bag changed since this page was loaded, so the total is no longer ' +
                    `₹${shown}. Please review your updated bag and confirm the new total.`
            );
        }
    }

    return {
        items,
        shippingAddress,
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
    };
}

/**
 * Only remove quantities that were actually purchased. This preserves products
 * a customer added while their PhonePe checkout was open.
 */
async function removePurchasedItemsFromCart(userId, orderItems, session) {
    const query = Cart.findOne({ user: userId });
    if (session) query.session(session);
    const cart = await query;
    if (!cart) return;

    for (const orderItem of orderItems) {
        const cartItem = cart.items.find(
            (item) =>
                String(item.product) === String(orderItem.product) &&
                item.size === orderItem.size &&
                item.color === orderItem.color
        );

        if (cartItem) {
            cartItem.quantity -= orderItem.quantity;
        }
    }

    cart.items = cart.items.filter((item) => item.quantity > 0);
    await cart.save(session ? { session } : undefined);
}

/**
 * Commit the inventory side of a sale: take the stock off the shelf and count
 * the sale, once per line.
 *
 * Stock was previously never decremented at all — only `soldCount` moved — so
 * the availability check in buildOrderFromCart only ever compared against the
 * seeded number and the same units could be sold indefinitely.
 *
 * The update is a single conditional document write per line: it matches the
 * size element *and* requires it to still hold enough stock, so two orders
 * racing for the last unit cannot both succeed. That matters because the
 * availability check happens when the order is built, which for PhonePe can be
 * twenty minutes before payment confirms (PHONEPE_PAYMENT_EXPIRY_SECONDS).
 *
 * A line that can no longer be satisfied is *recorded, not thrown*. By the time
 * this runs for an online order the customer's money has already been captured
 * and paymentStatus is 'paid'; throwing would roll the transaction back, leave
 * fulfillmentCommittedAt unset, and make the webhook fail and retry forever on
 * an order that is genuinely paid. Overselling one unit is recoverable by a
 * human; a paid order stuck unconfirmed is not. `stock` is declared `min: 0`,
 * and the conditional filter means it can never be driven negative either way.
 */
async function commitStockAndSales(orderItems, session) {
    const shortfalls = [];

    for (const item of orderItems) {
        const updated = await Product.findOneAndUpdate(
            {
                _id: item.product,
                sizes: { $elemMatch: { size: item.size, stock: { $gte: item.quantity } } },
            },
            {
                // The positional operator targets the element $elemMatch matched.
                $inc: { 'sizes.$.stock': -item.quantity, soldCount: item.quantity },
            },
            { new: true, ...(session ? { session } : {}) }
        );

        if (!updated) {
            // soldCount is deliberately not incremented here: nothing left the
            // shelf, so counting it as sold would put the two figures out of
            // step and hide the problem from whoever reconciles it.
            shortfalls.push({
                product: item.product,
                name: item.name,
                size: item.size,
                quantity: item.quantity,
                reason: 'insufficient_stock_at_fulfilment',
            });
        }
    }

    return shortfalls;
}

/**
 * Marks the commercial side of an order complete exactly once. The payment
 * provider status is updated separately so a webhook can be acknowledged
 * quickly and retried safely.
 */
async function fulfilOrder(order, { transactional = true } = {}) {
    // Cash-on-delivery retains the previous no-transaction behaviour so local
    // development with a standalone MongoDB keeps working. Paid orders always
    // use a transaction, which requires MongoDB Atlas/a replica set in live
    // deployments and prevents a duplicate webhook from double-counting sales.
    if (!transactional) {
        const currentOrder = await order.constructor.findById(order._id);
        if (!currentOrder || currentOrder.fulfillmentCommittedAt) return;

        await removePurchasedItemsFromCart(currentOrder.user, currentOrder.items);
        const shortfalls = await commitStockAndSales(currentOrder.items);

        if (shortfalls.length > 0) currentOrder.fulfillmentIssues = shortfalls;
        currentOrder.fulfillmentCommittedAt = new Date();
        await currentOrder.save();
        return;
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const currentOrder = await order.constructor.findById(order._id).session(session);
            if (!currentOrder || currentOrder.fulfillmentCommittedAt) return;

            await removePurchasedItemsFromCart(currentOrder.user, currentOrder.items, session);
            const shortfalls = await commitStockAndSales(currentOrder.items, session);

            if (shortfalls.length > 0) currentOrder.fulfillmentIssues = shortfalls;
            currentOrder.fulfillmentCommittedAt = new Date();
            await currentOrder.save({ session });
        });
    } finally {
        await session.endSession();
    }
}

module.exports = {
    OrderValidationError,
    CartChangedError,
    buildOrderFromCart,
    fulfilOrder,
    includedTax,
    validateShippingAddress,
};
