const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: String,
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    size: String,
    color: String,
    price: {
        type: Number,
        required: true
    },
    image: String
});

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderNumber: {
        type: String,
        unique: true
    },
    items: [orderItemSchema],
    shippingAddress: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true }
    },
    paymentMethod: {
        type: String,
        // Legacy values remain readable for historical orders. New online
        // payments are always processed through the PhonePe hosted checkout.
        enum: ['cod', 'phonepe', 'card', 'upi', 'netbanking'],
        default: 'cod'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'initiated', 'paid', 'failed', 'expired', 'refunded'],
        default: 'pending'
    },
    paymentDetails: {
        provider: { type: String, enum: ['phonepe', null] },
        merchantOrderId: String,
        phonepeOrderId: String,
        transactionId: String,
        paymentMode: String,
        amountPaisa: Number,
        providerState: String,
        failureCode: String,
        failureDetail: String,
        expiresAt: Date,
        providerUpdatedAt: Date,
        lastSource: String,
        paidAt: Date
    },
    itemsPrice: {
        type: Number,
        required: true
    },
    shippingPrice: {
        type: Number,
        default: 0
    },
    // The GST already contained in this order's prices, recorded for the tax
    // invoice — NOT an amount that was added to what the customer paid. See
    // includedTax() in order.service.js. Orders placed before GST went
    // inclusive hold an additive figure here instead; OrderCard distinguishes
    // the two from the totals rather than assuming.
    taxPrice: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    trackingNumber: String,
    deliveredAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    // The cart and sales counters are only updated after a verified payment.
    // Keeping this separately makes duplicate PhonePe callbacks harmless.
    fulfillmentCommittedAt: Date,
    // Lines that could not be taken from stock at fulfilment — almost always
    // two orders racing for the last unit between checkout and payment
    // confirmation. Recorded rather than thrown: the money is already captured
    // by then, so this needs a human (restock, refund, or part-ship), not a
    // failed webhook that retries forever. Empty on a clean order.
    fulfillmentIssues: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        size: String,
        quantity: Number,
        reason: String
    }]
}, {
    timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        const count = await mongoose.model('Order').countDocuments();
        this.orderNumber = `VYBE${Date.now()}${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

// PhonePe's merchant order ID is our immutable correlation key for status
// requests and callbacks. Sparse keeps existing cash-on-delivery orders valid.
orderSchema.index({ 'paymentDetails.merchantOrderId': 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Order', orderSchema);
