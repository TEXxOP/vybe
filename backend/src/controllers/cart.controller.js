const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id })
            .populate('items.product', 'name images price');

        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }

        res.status(200).json({
            success: true,
            cart
        });

    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cart'
        });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity, size, color } = req.body;

        // Validate product exists
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Find or create cart
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }

        // Check if item already exists
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId &&
                item.size === size &&
                item.color === color
        );

        if (existingItemIndex > -1) {
            // Update quantity if exists
            cart.items[existingItemIndex].quantity += quantity || 1;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity: quantity || 1,
                size,
                color,
                price: product.price
            });
        }

        await cart.save();

        // Populate and return
        await cart.populate('items.product', 'name images price');

        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            cart
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add item to cart'
        });
    }
};

// @desc    Update cart item
// @route   PUT /api/cart/update/:itemId
// @access  Private
exports.updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const { itemId } = req.params;

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const itemIndex = cart.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        await cart.save();
        await cart.populate('items.product', 'name images price');

        res.status(200).json({
            success: true,
            message: 'Cart updated',
            cart
        });

    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update cart'
        });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Private
exports.removeFromCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = cart.items.filter(
            item => item._id.toString() !== req.params.itemId
        );

        await cart.save();
        await cart.populate('items.product', 'name images price');

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            cart
        });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item'
        });
    }
};

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }

        res.status(200).json({
            success: true,
            message: 'Cart cleared'
        });

    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cart'
        });
    }
};
