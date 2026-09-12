const Order = require('../models/Order.model');
const { paginate } = require('../utils/helpers');
const {
    buildOrderFromCart,
    fulfilOrder,
    OrderValidationError,
} = require('../services/order.service');

// @desc    Create order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
    try {
        const { shippingAddress, paymentMethod } = req.body;

        // Card/UPI strings from old clients must not create a fake online order.
        // PhonePe checkout has its own endpoint and only confirms after a
        // provider-verified response.
        if (paymentMethod && paymentMethod !== 'cod') {
            return res.status(400).json({
                success: false,
                message: 'Use the PhonePe checkout endpoint for online payments'
            });
        }

        const orderData = await buildOrderFromCart(req.user.id, shippingAddress);

        // Create order
        const order = await Order.create({
            user: req.user.id,
            ...orderData,
            paymentMethod: 'cod',
        });

        await fulfilOrder(order, { transactional: false });

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(error instanceof OrderValidationError ? error.statusCode : 500).json({
            success: false,
            message: error instanceof OrderValidationError ? error.message : 'Failed to create order'
        });
    }
};

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req.query.page, req.query.limit);

        const orders = await Order.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments({ user: req.user.id });

        res.status(200).json({
            success: true,
            count: orders.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            orders
        });

    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product', 'name images');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check ownership (unless admin)
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check ownership
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Can only cancel pending or confirmed orders
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel order at this stage'
            });
        }

        // A paid gateway order cannot be silently turned into "cancelled": it
        // first needs a real, auditable refund through PhonePe. Keep this as a
        // support workflow until the dedicated refund endpoint is implemented.
        if (order.paymentMethod === 'phonepe' && order.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Please contact support to cancel a paid PhonePe order and arrange its refund'
            });
        }

        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelReason = req.body.reason || 'Cancelled by customer';
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order cancelled',
            order
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req.query.page, req.query.limit);

        const filters = {};
        if (req.query.status) filters.status = req.query.status;

        const orders = await Order.find(filters)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments(filters);

        res.status(200).json({
            success: true,
            count: orders.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            orders
        });

    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, trackingNumber } = req.body;

        if (!['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order status'
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (status === 'cancelled' && order.paymentMethod === 'phonepe' && order.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Refund the paid PhonePe order before marking it cancelled'
            });
        }

        order.status = status;
        if (trackingNumber) order.trackingNumber = trackingNumber;
        if (status === 'delivered') order.deliveredAt = new Date();

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order status updated',
            order
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order'
        });
    }
};
