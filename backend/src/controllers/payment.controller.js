const Order = require('../models/Order.model');
const {
    buildOrderFromCart,
    fulfilOrder,
    OrderValidationError,
} = require('../services/order.service');
const {
    createPhonePeCheckout,
    getPhonePeOrderStatus,
    isPhonePeConfigured,
    merchantOrderId,
    toPaisa,
    verifyPhonePeWebhook,
    PhonePeConfigurationError,
} = require('../services/phonepe.service');
const {
    createPineLabsCheckout,
    getPineLabsOrderStatus,
    isPineLabsConfigured,
    merchantOrderReference,
    toPaisa: pineLabsToPaisa,
    verifyPineLabsWebhook,
    PineLabsConfigurationError,
} = require('../services/pinelabs.service');

function paymentDetailsFromProvider(data = {}) {
    const completedAttempt = Array.isArray(data.paymentDetails)
        ? data.paymentDetails.find((attempt) => attempt?.state === 'COMPLETED') || data.paymentDetails[0]
        : null;

    return {
        phonepeOrderId: data.orderId,
        transactionId: completedAttempt?.transactionId,
        paymentMode: completedAttempt?.paymentMode,
        providerState: data.state,
        amountPaisa: Number.isFinite(Number(data.amount)) ? Number(data.amount) : undefined,
        failureCode: completedAttempt?.errorCode || data.errorCode,
        failureDetail: completedAttempt?.detailedErrorCode || data.detailedErrorCode,
        providerUpdatedAt: new Date(),
    };
}

function belongsToUser(order, user) {
    return String(order.user) === String(user._id || user.id);
}

function safeOrder(order) {
    return {
        _id: order._id,
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
    };
}

/**
 * A confirmed PhonePe state is the only path that changes a paid order's
 * fulfilment status. Browser redirects are intentionally not trusted.
 */
async function applyPhonePeStatus(order, providerData, source) {
    const providerState = String(providerData?.state || '').toUpperCase();
    const amountPaisa = Number(providerData?.amount);
    const expectedAmountPaisa = toPaisa(order.totalPrice);

    if (!providerState) {
        throw new Error('PhonePe response did not contain a payment state');
    }

    if (!Number.isSafeInteger(amountPaisa) || amountPaisa !== expectedAmountPaisa) {
        const error = new Error('PhonePe payment amount did not match the order total');
        error.statusCode = 400;
        throw error;
    }

    const details = paymentDetailsFromProvider(providerData);
    const providerDetailsUpdate = Object.fromEntries(
        Object.entries(details)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [`paymentDetails.${key}`, value])
    );
    const baseUpdate = {
        'paymentDetails.provider': 'phonepe',
        'paymentDetails.lastSource': source,
        ...providerDetailsUpdate,
    };

    if (providerState === 'COMPLETED') {
        const paidOrder = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: { $in: ['pending', 'initiated', 'failed'] } },
            {
                $set: {
                    ...baseUpdate,
                    paymentStatus: 'paid',
                    status: 'confirmed',
                    'paymentDetails.paidAt': new Date(),
                },
            },
            { new: true }
        );

        if (paidOrder) {
            await fulfilOrder(paidOrder);
            return paidOrder;
        }

        return Order.findById(order._id);
    }

    const paymentStatus = providerState === 'FAILED' ? 'failed' : 'initiated';
    return Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: { $in: ['pending', 'initiated', 'failed', 'expired'] } },
        { $set: { ...baseUpdate, paymentStatus } },
        { new: true }
    );
}

function sendPaymentError(res, error, fallbackMessage) {
    const configurationError =
        error instanceof PhonePeConfigurationError || error instanceof PineLabsConfigurationError;
    const status = error.statusCode || (configurationError ? 503 : 502);
    const message =
        error instanceof OrderValidationError || configurationError
            ? error.message
            : fallbackMessage;

    res.status(status).json({ success: false, message });
}

function pineLabsPaymentDetails(data = {}) {
    const payment = Array.isArray(data.payments)
        ? data.payments.find((attempt) => attempt?.status === 'PROCESSED') || data.payments.at(-1)
        : null;

    return {
        pineLabsOrderId: data.order_id,
        transactionId: payment?.id,
        paymentMode: payment?.payment_method,
        providerState: data.status,
        amountPaisa: Number.isFinite(Number(data.order_amount?.value))
            ? Number(data.order_amount.value)
            : undefined,
        failureCode: payment?.error_detail?.code,
        failureDetail: payment?.error_detail?.message,
        providerUpdatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
    };
}

/**
 * Pine Labs' signed webhook is trusted only as a prompt to re-fetch the order.
 * The status API remains the source of truth before a paid order is fulfilled.
 */
async function applyPineLabsStatus(order, providerData, source) {
    const providerState = String(providerData?.status || '').toUpperCase();
    const amountPaisa = Number(providerData?.order_amount?.value);
    const expectedAmountPaisa = pineLabsToPaisa(order.totalPrice);

    if (!providerState) {
        throw new Error('Pine Labs response did not contain an order state');
    }
    if (!Number.isSafeInteger(amountPaisa) || amountPaisa !== expectedAmountPaisa) {
        const error = new Error('Pine Labs payment amount did not match the order total');
        error.statusCode = 400;
        throw error;
    }

    const details = pineLabsPaymentDetails(providerData);
    const providerDetailsUpdate = Object.fromEntries(
        Object.entries(details)
            .filter(([, value]) => value !== undefined && !(value instanceof Date && Number.isNaN(value.valueOf())))
            .map(([key, value]) => [`paymentDetails.${key}`, value])
    );
    const baseUpdate = {
        'paymentDetails.provider': 'pinelabs',
        'paymentDetails.lastSource': source,
        ...providerDetailsUpdate,
    };

    if (providerState === 'PROCESSED') {
        const paidOrder = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: { $in: ['pending', 'initiated', 'failed'] } },
            {
                $set: {
                    ...baseUpdate,
                    paymentStatus: 'paid',
                    status: 'confirmed',
                    'paymentDetails.paidAt': new Date(),
                },
            },
            { new: true }
        );

        if (paidOrder) {
            await fulfilOrder(paidOrder);
            return paidOrder;
        }

        return Order.findById(order._id);
    }

    const paymentStatus = ['FAILED', 'CANCELLED'].includes(providerState) ? 'failed' : 'initiated';
    return Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: { $in: ['pending', 'initiated', 'failed', 'expired'] } },
        { $set: { ...baseUpdate, paymentStatus } },
        { new: true }
    );
}

// @desc    Report which hosted gateways are completely configured server-side
// @route   GET /api/payments/providers
// @access  Public (contains no credentials)
exports.getPaymentProviders = (req, res) => {
    res.json({
        success: true,
        providers: {
            phonepe: isPhonePeConfigured(),
            pinelabs: isPineLabsConfigured(),
        },
    });
};

// @desc    Create a PhonePe Standard Checkout session
// @route   POST /api/payments/phonepe/checkout
// @access  Private
exports.createPhonePeCheckout = async (req, res) => {
    try {
        if (!isPhonePeConfigured()) {
            throw new PhonePeConfigurationError('PhonePe payments are not configured yet');
        }

        const orderData = await buildOrderFromCart(req.user.id, req.body.shippingAddress, {
            expectedTotal: req.body.expectedTotal,
        });
        const order = new Order({
            user: req.user.id,
            ...orderData,
            paymentMethod: 'phonepe',
            paymentStatus: 'pending',
            paymentDetails: { provider: 'phonepe' },
        });
        order.paymentDetails.merchantOrderId = merchantOrderId(order._id);
        await order.save();

        try {
            const checkout = await createPhonePeCheckout({ order });
            order.paymentStatus = 'initiated';
            order.paymentDetails.amountPaisa = checkout.amountPaisa;
            order.paymentDetails.expiresAt = checkout.expiresAt;
            order.paymentDetails.providerState = 'PENDING';
            await order.save();

            return res.status(201).json({
                success: true,
                checkoutUrl: checkout.checkoutUrl,
                order: safeOrder(order),
            });
        } catch (error) {
            order.paymentStatus = 'failed';
            order.paymentDetails.failureCode = 'CHECKOUT_CREATION_FAILED';
            order.paymentDetails.providerUpdatedAt = new Date();
            await order.save();
            throw error;
        }
    } catch (error) {
        console.error('PhonePe checkout creation failed:', error.message);
        return sendPaymentError(res, error, 'Could not start PhonePe checkout. Please try again.');
    }
};

// @desc    Check and synchronise a PhonePe payment status
// @route   GET /api/payments/phonepe/orders/:id/status
// @access  Private
exports.getPhonePePaymentStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || order.paymentMethod !== 'phonepe') {
            return res.status(404).json({ success: false, message: 'PhonePe order not found' });
        }
        if (!belongsToUser(order, req.user) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view this payment' });
        }

        if (order.paymentStatus === 'paid') {
            return res.json({ success: true, order: safeOrder(order) });
        }

        const providerData = await getPhonePeOrderStatus(order.paymentDetails.merchantOrderId);
        const syncedOrder = await applyPhonePeStatus(order, providerData, 'status-api');

        return res.json({ success: true, order: safeOrder(syncedOrder || order) });
    } catch (error) {
        console.error('PhonePe status lookup failed:', error.message);
        return sendPaymentError(res, error, 'Could not verify the PhonePe payment yet. Please try again.');
    }
};

// @desc    Receive a verified PhonePe server-to-server callback
// @route   POST /api/payments/phonepe/webhook
// @access  Public (authenticated with PhonePe callback credentials)
exports.handlePhonePeWebhook = async (req, res) => {
    let callbackVerified = false;
    try {
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
        const callback = verifyPhonePeWebhook({
            authorization: req.get('authorization'),
            rawBody,
        });
        callbackVerified = true;
        const payload = callback?.payload || {};
        const providerMerchantOrderId = payload.merchantOrderId || payload.originalMerchantOrderId;

        if (!providerMerchantOrderId) {
            return res.status(400).json({ success: false, message: 'PhonePe callback has no merchant order ID' });
        }

        const order = await Order.findOne({
            paymentMethod: 'phonepe',
            'paymentDetails.merchantOrderId': providerMerchantOrderId,
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'PhonePe order not found' });
        }

        await applyPhonePeStatus(order, payload, callback.event || callback.type || 'webhook');
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('PhonePe webhook rejected:', error.message);
        const status =
            error.statusCode ||
            (error instanceof PhonePeConfigurationError ? 503 : callbackVerified ? 500 : 401);
        return res.status(status).json({
            success: false,
            message: callbackVerified ? 'Could not process PhonePe webhook' : 'Invalid PhonePe webhook',
        });
    }
};

// @desc    Create a Pine Labs Online hosted checkout session
// @route   POST /api/payments/pinelabs/checkout
// @access  Private
exports.createPineLabsCheckout = async (req, res) => {
    try {
        if (!isPineLabsConfigured()) {
            throw new PineLabsConfigurationError('Pine Labs payments are not configured yet');
        }

        const orderData = await buildOrderFromCart(req.user.id, req.body.shippingAddress, {
            expectedTotal: req.body.expectedTotal,
        });
        const order = new Order({
            user: req.user.id,
            ...orderData,
            paymentMethod: 'pinelabs',
            paymentStatus: 'pending',
            paymentDetails: { provider: 'pinelabs' },
        });
        order.paymentDetails.merchantOrderId = merchantOrderReference(order._id);
        await order.save();

        try {
            const checkout = await createPineLabsCheckout({ order, customer: req.user });
            order.paymentStatus = 'initiated';
            order.paymentDetails.pineLabsOrderId = checkout.pineLabsOrderId;
            order.paymentDetails.checkoutToken = checkout.checkoutToken;
            order.paymentDetails.amountPaisa = checkout.amountPaisa;
            order.paymentDetails.providerState = 'CREATED';
            await order.save();

            return res.status(201).json({
                success: true,
                checkoutUrl: checkout.checkoutUrl,
                order: safeOrder(order),
            });
        } catch (error) {
            order.paymentStatus = 'failed';
            order.paymentDetails.failureCode = 'CHECKOUT_CREATION_FAILED';
            order.paymentDetails.providerUpdatedAt = new Date();
            await order.save();
            throw error;
        }
    } catch (error) {
        console.error('Pine Labs checkout creation failed:', error.message);
        return sendPaymentError(res, error, 'Could not start Pine Labs checkout. Please try again.');
    }
};

// @desc    Check and synchronise a Pine Labs payment status
// @route   GET /api/payments/pinelabs/orders/:id/status
// @access  Private
exports.getPineLabsPaymentStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || order.paymentMethod !== 'pinelabs') {
            return res.status(404).json({ success: false, message: 'Pine Labs order not found' });
        }
        if (!belongsToUser(order, req.user) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view this payment' });
        }
        if (order.paymentStatus === 'paid') {
            return res.json({ success: true, order: safeOrder(order) });
        }

        const providerData = await getPineLabsOrderStatus(order.paymentDetails.pineLabsOrderId);
        const syncedOrder = await applyPineLabsStatus(order, providerData, 'status-api');
        return res.json({ success: true, order: safeOrder(syncedOrder || order) });
    } catch (error) {
        console.error('Pine Labs status lookup failed:', error.message);
        return sendPaymentError(res, error, 'Could not verify the Pine Labs payment yet. Please try again.');
    }
};

// @desc    Receive a signed Pine Labs Online webhook
// @route   POST /api/payments/pinelabs/webhook
// @access  Public (HMAC verified against the raw request body)
exports.handlePineLabsWebhook = async (req, res) => {
    let callbackVerified = false;
    try {
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
        const callback = verifyPineLabsWebhook({
            webhookId: req.get('webhook-id'),
            webhookTimestamp: req.get('webhook-timestamp'),
            webhookSignature: req.get('webhook-signature'),
            rawBody,
        });
        callbackVerified = true;

        const pineLabsOrderId = callback?.data?.order_id;
        if (!pineLabsOrderId) {
            return res.status(400).json({ success: false, message: 'Pine Labs callback has no order ID' });
        }

        const order = await Order.findOne({
            paymentMethod: 'pinelabs',
            'paymentDetails.pineLabsOrderId': pineLabsOrderId,
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pine Labs order not found' });
        }

        const providerData = await getPineLabsOrderStatus(pineLabsOrderId);
        await applyPineLabsStatus(order, providerData, callback.event_type || 'webhook');
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Pine Labs webhook rejected:', error.message);
        const status =
            error.statusCode ||
            (error instanceof PineLabsConfigurationError ? 503 : callbackVerified ? 500 : 401);
        return res.status(status).json({
            success: false,
            message: callbackVerified ? 'Could not process Pine Labs webhook' : 'Invalid Pine Labs webhook',
        });
    }
};
