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

    const fallbackProducts = [
        {
            _id: '1',
            name: 'Chroma Surge Jacket',
            price: 4999,
            rating: { average: 4.5 },
            images: [{ url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300&h=400&fit=crop' }],
            limitedStock: 50,
            category: 'Outerwear'
        },
        {
            _id: '2',
            name: 'Vivid Blueprint Shirt',
            price: 1999,
            rating: { average: 4.2 },
            images: [{ url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&h=400&fit=crop' }],
            badge: 'limited',
            category: 'Tops',
            limitedStock: 8
        },
        {
            _id: '3',
            name: 'Heritage Wave Cap',
            price: 1499,
            rating: { average: 4.8 },
            images: [{ url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&h=400&fit=crop' }],
            limitedStock: 5,
            category: 'Accessories'
        },
        {
            _id: '4',
            name: 'Graffiti Canvas Cargo',
            price: 3499,
            rating: { average: 3.9 },
            images: [{ url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300&h=400&fit=crop' }],
            limitedStock: 12,
            category: 'Bottoms'
        }
    ];

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await productsAPI.getLimited();
                if (data.products && data.products.length > 0) {
                    setProducts(data.products.slice(0, 4));
                } else {
                    setProducts(fallbackProducts);
                }
            } catch {
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
                            days = Math.max(0, days - 1);
                            if (days === 0) {
                                hours = 0; minutes = 0; seconds = 0;
                            }
                        }
                    }
                }
                return { days, hours, minutes, seconds };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const getBadgeText = (product) => {
        if (product.limitedStock != null) {
            if (product.limitedStock <= 5) return `Only ${product.limitedStock} Left!`;
            if (product.limitedStock <= 12) return `${product.limitedStock} Remaining`;
            return `Only ${product.limitedStock} Made`;
        }
        if (product.badge === 'limited') return 'Final Drop';
        return 'Limited Edition';
    };

    // Returns a 0–100 fill percentage for the scarcity bar
    const getScarcityPercent = (product) => {
        const stock = product.limitedStock ?? 50;
        const max = 50;
        const sold = Math.max(0, max - stock);
        return Math.round((sold / max) * 100);
    };

    const getScarcityLabel = (product) => {
        const pct = getScarcityPercent(product);
        if (pct >= 90) return 'Almost gone!';
        if (pct >= 70) return `${100 - pct}% remaining`;
        return `${product.limitedStock ?? 50} units left`;
    };

    const formatPrice = (price) => price.toLocaleString('en-IN');

    const pad = (n) => String(n).padStart(2, '0');

    return (
        <section className="limited-edition" id="limited" data-reveal>
            <div className="limited-container">

                {/* ── Header ── */}
                <div className="limited-header" data-reveal>
                    <div className="limited-title-wrapper">
                        <div className="limited-eyebrow">
                            <span className="limited-eyebrow-dot" />
                            Drops &amp; Exclusives
                        </div>
                        <h2 className="limited-title">
                            Limited <span>Edition</span>
                        </h2>
                        <p className="limited-subtitle">Once it's gone, it's gone — forever.</p>
                    </div>

                    {/* Countdown */}
                    <div className="countdown-wrapper">
                        <span className="countdown-label">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E87D6F" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Next drop in
                        </span>
                        <div className="countdown-timer">
                            <div className="countdown-item">
                                <span className="countdown-value">{pad(countdown.days)}</span>
                                <span className="countdown-unit">days</span>
                            </div>
                            <span className="countdown-sep">:</span>
                            <div className="countdown-item">
                                <span className="countdown-value">{pad(countdown.hours)}</span>
                                <span className="countdown-unit">hrs</span>
                            </div>
                            <span className="countdown-sep">:</span>
                            <div className="countdown-item">
                                <span className="countdown-value">{pad(countdown.minutes)}</span>
                                <span className="countdown-unit">min</span>
                            </div>
                            <span className="countdown-sep">:</span>
                            <div className="countdown-item">
                                <span className="countdown-value">{pad(countdown.seconds)}</span>
                                <span className="countdown-unit">sec</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="limited-nav">
                        <div className="pagination-dots">
                            <span className="dot active" />
                            <span className="dot" />
                            <span className="dot" />
                            <span className="dot" />
                        </div>
                        <div className="nav-arrows">
                            <button className="nav-arrow prev" aria-label="Previous">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                            </button>
                            <button className="nav-arrow next" aria-label="Next">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Product Cards ── */}
                <div className="products-grid">
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="product-card loading" style={{ '--reveal-delay': `${i * 80}ms` }}>
                                <div className="product-image skeleton" />
                                <div className="product-info">
                                    <div className="skeleton-text" />
                                    <div className="skeleton-text short" />
                                </div>
                            </div>
                        ))
                    ) : (
                        products.map((product, index) => (
                            <Link
                                to={`/product/${product._id}`}
                                key={product._id}
                                className="product-card"
                                data-reveal
                                style={{ '--reveal-delay': `${index * 80}ms` }}
                            >
                                {/* Badge */}
                                <div className="product-badge">{getBadgeText(product)}</div>

                                {/* Image */}
                                <div className="product-image">
                                    <img
                                        src={product.images?.[0]?.url || product.image}
                                        alt={product.name}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <span className="quick-add" aria-hidden="true">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                    </span>
                                    <span className="quick-view-btn">Quick View →</span>
                                </div>

                                {/* Info */}
                                <div className="product-info">
                                    {product.category && (
                                        <p className="product-category-tag">{product.category}</p>
                                    )}
                                    <h4>{product.name}</h4>
                                    <div className="product-meta">
                                        <div className="product-rating">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="#E87D6F">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                            <span>{product.rating?.average ?? product.rating}</span>
                                        </div>
                                        <span className="product-price">₹{formatPrice(product.price)}</span>
                                    </div>

                                    {/* Scarcity bar */}
                                    {product.limitedStock != null && (
                                        <div className="scarcity-bar-wrapper">
                                            <p className="scarcity-label">{getScarcityLabel(product)}</p>
                                            <div className="scarcity-bar">
                                                <div
                                                    className="scarcity-fill"
                                                    style={{ width: `${getScarcityPercent(product)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                {/* ── View All ── */}
                <div className="view-all-wrapper">
                    <Link to="/shop" className="view-all-btn">
                        <span>View All Limited Editions</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

            </div>
        </section>
    );
};

export default LimitedEdition;
