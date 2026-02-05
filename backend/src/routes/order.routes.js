const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/validate.middleware');

// All order routes require authentication
router.use(protect);

// User routes
router.post('/', sanitizeInput, orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);
router.get('/:id', orderController.getOrder);
router.put('/:id/cancel', orderController.cancelOrder);

// Admin routes
router.get('/', restrictTo('admin'), orderController.getAllOrders);
router.put('/:id/status', restrictTo('admin'), sanitizeInput, orderController.updateOrderStatus);

module.exports = router;
