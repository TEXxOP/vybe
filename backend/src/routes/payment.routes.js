const express = require('express');

const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/providers', paymentController.getPaymentProviders);
router.post('/phonepe/checkout', protect, sanitizeInput, paymentController.createPhonePeCheckout);
router.get('/phonepe/orders/:id/status', protect, paymentController.getPhonePePaymentStatus);
router.post('/pinelabs/checkout', protect, sanitizeInput, paymentController.createPineLabsCheckout);
router.get('/pinelabs/orders/:id/status', protect, paymentController.getPineLabsPaymentStatus);

module.exports = router;
