const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    comparePrice: {
        type: Number,
        min: [0, 'Compare price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['jackets', 'shirts', 'pants', 'caps', 'accessories', 'shoes', 'hoodies']
    },
    collection: {
        type: String,
        enum: ['edge', 'canvas', 'energy', 'limited', 'classics']
    },
    images: [{
        url: { type: String, required: true },
        alt: String
    }],
    sizes: [{
        size: { type: String, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        stock: { type: Number, default: 0, min: 0 }
    }],
    colors: [{
        name: String,
        hexCode: String
    }],
    tags: [String],
    badge: {
        type: String,
        enum: ['new', 'bestseller', 'limited', 'sale', 'soldout', null]
    },
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    isLimited: {
        type: Boolean,
        default: false
    },
    limitedStock: {
        type: Number,
        min: 0
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    soldCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total stock
productSchema.virtual('totalStock').get(function () {
    return this.sizes.reduce((total, size) => total + size.stock, 0);
});

// Virtual for discount percentage
productSchema.virtual('discountPercent').get(function () {
    if (this.comparePrice && this.comparePrice > this.price) {
        return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
    }
    return 0;
});

// Index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, collection: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);
