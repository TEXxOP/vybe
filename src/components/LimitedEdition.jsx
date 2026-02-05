import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../services/api';
import './LimitedEdition.css';

const LimitedEdition = () => {
    const [countdown, setCountdown] = useState({
        days: 2,
        hours: 13,
        minutes: 22,
        seconds: 45
    });
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fallback products (keeps UI same if API fails)
    const fallbackProducts = [
        {
            _id: '1',
            name: 'Chroma Surge Jacket',
            price: 4999,
            rating: { average: 4.5 },
            images: [{ url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300&h=400&fit=crop' }],
            limitedStock: 50
        },
        {
            _id: '2',
            name: 'Vivid Blueprint Shirt',
            price: 1999,
            rating: { average: 4.2 },
            images: [{ url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&h=400&fit=crop' }],
            badge: 'limited'
        },
        {
            _id: '3',
            name: 'Heritage Wave Cap',
            price: 1499,
            rating: { average: 4.8 },
            images: [{ url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&h=400&fit=crop' }],
            limitedStock: 5
        },
        {
            _id: '4',
            name: 'Graffiti Canvas Cargo',
            price: 3499,
            rating: { average: 3.9 },
            images: [{ url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300&h=400&fit=crop' }],
            limitedStock: 12
        }
    ];

    // Fetch limited edition products from API
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await productsAPI.getLimited();
                if (data.products && data.products.length > 0) {
                    setProducts(data.products.slice(0, 4)); // Show max 4
                } else {
                    setProducts(fallbackProducts);
                }
            } catch (error) {
                console.log('Using fallback products');
                setProducts(fallbackProducts);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                let { days, hours, minutes, seconds } = prev;
                seconds--;
                if (seconds < 0) {
                    seconds = 59;
                    minutes--;
                    if (minutes < 0) {
                        minutes = 59;
                        hours--;
                        if (hours < 0) {
                            hours = 23;
                            days--;
                            if (days < 0) {
                                days = 0;
                                hours = 0;
                                minutes = 0;
                                seconds = 0;
                            }
                        }
                    }
                }
                return { days, hours, minutes, seconds };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Helper to get badge text
    const getBadgeText = (product) => {
        if (product.limitedStock && product.limitedStock <= 50) {
            if (product.limitedStock <= 12) return `Only ${product.limitedStock} Left`;
            return `Only ${product.limitedStock} made`;
        }
        if (product.badge === 'limited') return 'Final Drop';
        return 'Limited Edition';
    };

    // Format price with comma
    const formatPrice = (price) => {
        return price.toLocaleString('en-IN');
    };

    return (
        <section className="limited-edition" id="limited">
            <div className="limited-container">
                {/* Title Section */}
                <div className="limited-header">
                    <div className="limited-title-wrapper">
                        <h2 className="limited-title">Limited Edition</h2>
                        <p className="limited-subtitle">Once it's gone, it's gone.</p>
                    </div>

                    {/* Countdown Timer */}
                    <div className="countdown-wrapper">
                        <span className="countdown-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E87D6F" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            New drop in
                        </span>
                        <div className="countdown-timer">
                            <div className="countdown-item">
                                <span className="countdown-value">{String(countdown.days).padStart(2, '0')}</span>
                                <span className="countdown-unit">days</span>
                            </div>
                            <span className="countdown-sep">:</span>
                            <div className="countdown-item">
                                <span className="countdown-value">{String(countdown.hours).padStart(2, '0')}</span>
                                <span className="countdown-unit">hrs</span>
                            </div>
                            <span className="countdown-sep">:</span>
                            <div className="countdown-item">
                                <span className="countdown-value">{String(countdown.minutes).padStart(2, '0')}</span>
                                <span className="countdown-unit">min</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="limited-nav">
                        <div className="pagination-dots">
                            <span className="dot active"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                        <div className="nav-arrows">
                            <button className="nav-arrow prev">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                            </button>
                            <button className="nav-arrow next">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Product Cards */}
                <div className="products-grid">
                    {loading ? (
                        // Loading skeleton
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="product-card loading">
                                <div className="product-image skeleton"></div>
                                <div className="product-info">
                                    <div className="skeleton-text"></div>
                                    <div className="skeleton-text short"></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        products.map((product) => (
                            <Link to={`/product/${product._id}`} key={product._id} className="product-card">
                                <div className="product-badge">{getBadgeText(product)}</div>
                                <div className="product-image">
                                    <img
                                        src={product.images?.[0]?.url || product.image}
                                        alt={product.name}
                                    />
                                    <span className="quick-add">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="product-info">
                                    <h4>{product.name}</h4>
                                    <div className="product-meta">
                                        <div className="product-rating">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#E87D6F">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                            <span>{product.rating?.average || product.rating}</span>
                                        </div>
                                        <span className="product-price">₹{formatPrice(product.price)}</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                {/* View All Button */}
                <div className="view-all-wrapper">
                    <Link to="/shop" className="view-all-btn">
                        View All Limited Editions
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default LimitedEdition;
