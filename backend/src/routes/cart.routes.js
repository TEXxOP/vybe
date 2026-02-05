const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/validate.middleware');

// All cart routes require authentication
router.use(protect);

router.get('/', cartController.getCart);
router.post('/add', sanitizeInput, cartController.addToCart);
router.put('/update/:itemId', sanitizeInput, cartController.updateCartItem);
router.delete('/remove/:itemId', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

module.exports = router;
