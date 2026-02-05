const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { protect, restrictTo, optionalAuth } = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/validate.middleware');

// Public routes
router.get('/', optionalAuth, productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/limited', productController.getLimitedProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', optionalAuth, productController.getProduct);

// Admin routes
router.post('/', protect, restrictTo('admin'), sanitizeInput, productController.createProduct);
router.put('/:id', protect, restrictTo('admin'), sanitizeInput, productController.updateProduct);
router.delete('/:id', protect, restrictTo('admin'), productController.deleteProduct);

module.exports = router;
