const jwt = require('jsonwebtoken');

// Generate JWT token
exports.generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Create and send token response
exports.sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    const token = exports.generateToken(user._id);

    // Cookie options
    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    // Remove password from output
    user.password = undefined;

    res.status(statusCode)
        .cookie('token', token, cookieOptions)
        .json({
            success: true,
            message,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
};

// Pagination helper
exports.paginate = (page = 1, limit = 10) => {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    return {
        page: pageNum,
        limit: Math.min(limitNum, 50), // Max 50 items per page
        skip
    };
};

// Build query filters
exports.buildFilters = (query) => {
    const filters = {};

    // Price range
    if (query.minPrice || query.maxPrice) {
        filters.price = {};
        if (query.minPrice) filters.price.$gte = parseFloat(query.minPrice);
        if (query.maxPrice) filters.price.$lte = parseFloat(query.maxPrice);
    }

    // Category
    if (query.category) {
        filters.category = query.category.toLowerCase();
    }

    // Collection
    if (query.collection) {
        filters.collection = query.collection.toLowerCase();
    }

    // Active status
    filters.isActive = true;

    return filters;
};
