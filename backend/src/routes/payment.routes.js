const express = require('express');

const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/validate.middleware');

const router = express.Router();

router.post('/phonepe/checkout', protect, sanitizeInput, paymentController.createPhonePeCheckout);
router.get('/phonepe/orders/:id/status', protect, paymentController.getPhonePePaymentStatus);

module.exports = router;
