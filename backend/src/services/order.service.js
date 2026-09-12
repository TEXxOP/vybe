const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const mongoose = require('mongoose');

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_PRICE = 99;
const TAX_RATE = 0.18;

class OrderValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'OrderValidationError';
        this.statusCode = 400;
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
 */
async function buildOrderFromCart(userId, shippingAddress) {
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
    const taxPrice = Math.round(itemsPrice * TAX_RATE);

    return {
        items,
        shippingAddress,
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice: itemsPrice + shippingPrice + taxPrice,
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
        for (const item of currentOrder.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { soldCount: item.quantity },
            });
        }
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

            for (const item of currentOrder.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { soldCount: item.quantity },
                }, { session });
            }

            currentOrder.fulfillmentCommittedAt = new Date();
            await currentOrder.save({ session });
        });
    } finally {
        await session.endSession();
    }
}

module.exports = {
    OrderValidationError,
    buildOrderFromCart,
    fulfilOrder,
    validateShippingAddress,
};
