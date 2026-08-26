require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product.model');
const User = require('./src/models/User.model');

const products = [
    // Limited Edition Products (matching current UI)
    {
        name: 'Chroma Surge Jacket',
        description: 'Bold, statement-making jacket with vibrant color blocking. Limited edition streetwear piece designed for those who dare to stand out.',
        price: 2499,
        comparePrice: 2500,
        category: 'jackets',
        collection: 'limited',
        images: [
            { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&h=600&fit=crop', alt: 'Chroma Surge Jacket' }
        ],
        sizes: [
            { size: 'S', stock: 10 },
            { size: 'M', stock: 15 },
            { size: 'L', stock: 12 },
            { size: 'XL', stock: 8 }
        ],
        colors: [{ name: 'Multi', hexCode: '#E87D6F' }],
        tags: ['limited', 'jacket', 'streetwear', 'bold'],
        badge: 'limited',
        rating: { average: 4.5, count: 89 },
        isLimited: true,
        limitedStock: 50,
        isFeatured: true
    },
    {
        name: 'Vivid Blueprint Shirt',
        description: 'Architectural-inspired graphic shirt with unique blueprint patterns. A fusion of urban art and fashion.',
        price: 999,
        comparePrice: 1299,
        category: 'shirts',
        collection: 'limited',
        images: [
            { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&h=600&fit=crop', alt: 'Vivid Blueprint Shirt' }
        ],
        sizes: [
            { size: 'S', stock: 20 },
            { size: 'M', stock: 25 },
            { size: 'L', stock: 18 },
            { size: 'XL', stock: 10 }
        ],
        colors: [{ name: 'Blue', hexCode: '#3B82F6' }],
        tags: ['limited', 'shirt', 'graphic', 'urban'],
        badge: 'limited',
        rating: { average: 4.2, count: 156 },
        isLimited: true,
        limitedStock: 100,
        isFeatured: false
    },
    {
        name: 'Graffiti Canvas Cargo',
        description: 'Street art-inspired cargo pants with graffiti accents. Multiple pockets, relaxed fit, premium cotton blend.',
        price: 1799,
        comparePrice: 2199,
        category: 'pants',
        collection: 'limited',
        images: [
            { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&h=600&fit=crop', alt: 'Graffiti Canvas Cargo' }
        ],
        sizes: [
            { size: 'S', stock: 8 },
            { size: 'M', stock: 12 },
            { size: 'L', stock: 10 },
            { size: 'XL', stock: 5 }
        ],
        colors: [{ name: 'Olive', hexCode: '#808000' }],
        tags: ['limited', 'cargo', 'pants', 'graffiti'],
        badge: 'limited',
        rating: { average: 3.9, count: 67 },
        isLimited: true,
        limitedStock: 35,
        isFeatured: false
    },
    // EDGE Collection
    {
        name: 'Shadow Edge Hoodie',
        description: 'Dark aesthetic hoodie with minimal branding. Heavyweight cotton, oversized fit for maximum comfort.',
        price: 1699,
        category: 'hoodies',
        collection: 'edge',
        images: [
            { url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&h=600&fit=crop', alt: 'Shadow Edge Hoodie' }
        ],
        sizes: [
            { size: 'S', stock: 25 },
            { size: 'M', stock: 40 },
            { size: 'L', stock: 35 },
            { size: 'XL', stock: 20 },
            { size: 'XXL', stock: 10 }
        ],
        colors: [
            { name: 'Black', hexCode: '#1A1A1A' },
            { name: 'Charcoal', hexCode: '#36454F' }
        ],
        tags: ['edge', 'hoodie', 'minimal', 'dark'],
        badge: 'bestseller',
        rating: { average: 4.7, count: 412 },
        isLimited: false,
        isFeatured: true
    },
    {
        name: 'Razor Cut Tee',
        description: 'Sharp, angular graphic tee with distressed details. Premium organic cotton, relaxed streetwear fit.',
        price: 899,
        category: 'shirts',
        collection: 'edge',
        images: [
            { url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&h=600&fit=crop', alt: 'Razor Cut Tee' }
        ],
        sizes: [
            { size: 'S', stock: 50 },
            { size: 'M', stock: 60 },
            { size: 'L', stock: 45 },
            { size: 'XL', stock: 30 }
        ],
        colors: [
            { name: 'White', hexCode: '#FFFFFF' },
            { name: 'Black', hexCode: '#1A1A1A' }
        ],
        tags: ['edge', 'tee', 'graphic', 'distressed'],
        badge: 'new',
        rating: { average: 4.4, count: 189 },
        isLimited: false,
        isFeatured: false
    },
    // CANVAS Collection
    {
        name: 'Abstract Canvas Jacket',
        description: 'Artistic denim jacket with hand-painted abstract patterns. Each piece is unique and one-of-a-kind.',
        price: 2399,
        category: 'jackets',
        collection: 'canvas',
        images: [
            { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=600&fit=crop', alt: 'Abstract Canvas Jacket' }
        ],
        sizes: [
            { size: 'S', stock: 5 },
            { size: 'M', stock: 8 },
            { size: 'L', stock: 6 },
            { size: 'XL', stock: 3 }
        ],
        colors: [{ name: 'Denim', hexCode: '#1560BD' }],
        tags: ['canvas', 'jacket', 'abstract', 'artsy'],
        badge: 'new',
        rating: { average: 4.9, count: 45 },
        isLimited: false,
        isFeatured: true
    },
    {
        name: 'Palette Blend Shirt',
        description: 'Color-splashed button-up shirt inspired by artist palettes. Relaxed fit, premium cotton.',
        price: 1299,
        category: 'shirts',
        collection: 'canvas',
        images: [
            { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&h=600&fit=crop', alt: 'Palette Blend Shirt' }
        ],
        sizes: [
            { size: 'S', stock: 15 },
            { size: 'M', stock: 20 },
            { size: 'L', stock: 18 },
            { size: 'XL', stock: 12 }
        ],
        colors: [{ name: 'Multi', hexCode: '#E87D6F' }],
        tags: ['canvas', 'shirt', 'colorful', 'artistic'],
        badge: null,
        rating: { average: 4.3, count: 78 },
        isLimited: false,
        isFeatured: false
    },
    // ENERGY Collection
    {
        name: 'Volt Track Pants',
        description: 'Electric track pants with side stripe design. Perfect for athleisure and street style.',
        price: 1499,
        category: 'pants',
        collection: 'energy',
        images: [
            { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&h=600&fit=crop', alt: 'Volt Track Pants' }
        ],
        sizes: [
            { size: 'S', stock: 30 },
            { size: 'M', stock: 40 },
            { size: 'L', stock: 35 },
            { size: 'XL', stock: 20 }
        ],
        colors: [
            { name: 'Black/Yellow', hexCode: '#FFD700' },
            { name: 'Navy/White', hexCode: '#000080' }
        ],
        tags: ['energy', 'track', 'pants', 'athleisure'],
        badge: null,
        rating: { average: 4.1, count: 234 },
        isLimited: false,
        isFeatured: false
    },
    // Hero Featured Product
    {
        name: 'Urban Vanguard Tee',
        description: 'The ultimate streetwear essential. Premium organic cotton, perfect fit, unmatched comfort. A must-have in every collection.',
        price: 1399,
        comparePrice: 1799,
        category: 'shirts',
        collection: 'classics',
        images: [
            { url: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=500&h=600&fit=crop', alt: 'Urban Vanguard Tee' }
        ],
        sizes: [
            { size: 'XS', stock: 20 },
            { size: 'S', stock: 50 },
            { size: 'M', stock: 80 },
            { size: 'L', stock: 60 },
            { size: 'XL', stock: 40 },
            { size: 'XXL', stock: 20 }
        ],
        colors: [
            { name: 'White', hexCode: '#FFFFFF' },
            { name: 'Black', hexCode: '#1A1A1A' },
            { name: 'Coral', hexCode: '#E87D6F' }
        ],
        tags: ['classics', 'tee', 'essential', 'premium'],
        badge: 'bestseller',
        rating: { average: 4.8, count: 1247 },
        isLimited: false,
        isFeatured: true
    },
    // Additional products for variety
    {
        name: 'Street Cipher Hoodie',
        description: 'Encoded streetwear hoodie with hidden message graphics. Heavyweight fleece, oversized silhouette.',
        price: 1999,
        category: 'hoodies',
        collection: 'edge',
        images: [
            { url: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=500&h=600&fit=crop', alt: 'Street Cipher Hoodie' }
        ],
        sizes: [
            { size: 'S', stock: 18 },
            { size: 'M', stock: 25 },
            { size: 'L', stock: 22 },
            { size: 'XL', stock: 15 }
        ],
        colors: [{ name: 'Black', hexCode: '#1A1A1A' }],
        tags: ['edge', 'hoodie', 'graphic', 'cipher'],
        badge: 'new',
        rating: { average: 4.5, count: 98 },
        isLimited: false,
        isFeatured: false
    }
];

// Admin user for testing
const adminUser = {
    name: 'VYBE Admin',
    email: 'admin@vybe.com',
    password: 'Admin@123',
    role: 'admin',
    phone: '+91 9876543210'
};

const seedDB = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Product.deleteMany({});
        await User.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Seed products
        const createdProducts = await Product.insertMany(products);
        console.log(`📦 Seeded ${createdProducts.length} products`);

        // Create admin user
        const admin = await User.create(adminUser);
        console.log(`👤 Created admin user: ${admin.email}`);

        console.log('\n✅ Database seeded successfully!');
        console.log('\n📋 Admin Login Credentials:');
        console.log('   Email: admin@vybe.com');
        console.log('   Password: Admin@123');

        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
};

seedDB();
