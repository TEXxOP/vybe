import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { Icons } from '../components/Icons';
import './Shop.css';

const Shop = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    const categories = ['all', 'jackets', 'shirts', 'hoodies', 'pants', 'shoes', 'caps', 'accessories'];

    useEffect(() => {
        fetchProducts();
    }, [category, sortBy]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const params = {};
            if (category !== 'all') params.category = category;
            if (sortBy === 'price-low') params.sort = 'price';
            if (sortBy === 'price-high') params.sort = '-price';

            const data = await productsAPI.getAll(params);
            setProducts(data.products || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => price.toLocaleString('en-IN');

    return (
        <div className="shop-page">
            <div className="shop-container">
                {/* Header */}
                <div className="shop-header">
                    <h1>Shop Collection</h1>
                    <p>Discover the future of streetwear</p>
                </div>

                {/* Filters */}
                <div className="shop-filters">
                    <div className="category-filters">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`filter-btn ${category === cat ? 'active' : ''}`}
                                onClick={() => setCategory(cat)}
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="sort-filter">
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">Newest</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                        </select>
                    </div>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="shop-loading">
                        <div className="loader"></div>
                        <p>Loading products...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="no-products">
                        <p>No products found in this category.</p>
                    </div>
                ) : (
                    <div className="products-grid">
                        {products.map(product => (
                            <Link to={`/product/${product._id}`} key={product._id} className="product-card">
                                {product.badge && (
                                    <span className={`badge ${product.badge}`}>{product.badge}</span>
                                )}
                                <div className="product-image">
                                    <img
                                        src={product.images?.[0]?.url}
                                        alt={product.name}
                                    />
                                </div>
                                <div className="product-info">
                                    <h3>{product.name}</h3>
                                    <div className="product-meta">
                                        <div className="rating">
                                            <span className="star"><Icons.Star size={14} color="#E87D6F" filled /></span>
                                            <span>{product.rating?.average || 4.5}</span>
                                        </div>
                                        <span className="price">₹{formatPrice(product.price)}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Shop;
