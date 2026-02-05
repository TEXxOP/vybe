import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { Icons } from '../components/Icons';
import './ProductDetail.css';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [currentImage, setCurrentImage] = useState(0);
    const [addedToCart, setAddedToCart] = useState(false);

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const data = await productsAPI.getById(id);
            setProduct(data.product);
            if (data.product.sizes?.length > 0) {
                setSelectedSize(data.product.sizes[0].size);
            }
            if (data.product.colors?.length > 0) {
                setSelectedColor(data.product.colors[0].name);
            }
        } catch (error) {
            console.error('Failed to fetch product:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = () => {
        if (!selectedSize || !selectedColor) {
            alert('Please select size and color');
            return;
        }
        addToCart(product, quantity, selectedSize, selectedColor);
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const formatPrice = (price) => price.toLocaleString('en-IN');

    const renderStars = (rating) => {
        const stars = [];
        const count = Math.round(rating || 5);
        for (let i = 0; i < count; i++) {
            stars.push(<Icons.Star key={i} size={14} color="#E87D6F" filled />);
        }
        return stars;
    };

    if (loading) {
        return (
            <div className="product-detail-page loading">
                <div className="loader"></div>
                <p>Loading product...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="product-detail-page not-found">
                <h2>Product not found</h2>
                <button onClick={() => navigate('/shop')}>Back to Shop</button>
            </div>
        );
    }

    return (
        <div className="product-detail-page">
            <div className="product-detail-container">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><Icons.ArrowRight size={16} /></span> Back
                </button>

                <div className="product-detail-content">
                    {/* Images Section */}
                    <div className="product-images">
                        <div className="main-image">
                            <img
                                src={product.images?.[currentImage]?.url}
                                alt={product.name}
                            />
                            {product.badge && (
                                <span className="badge">{product.badge}</span>
                            )}
                        </div>
                        {product.images?.length > 1 && (
                            <div className="image-thumbs">
                                {product.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        className={`thumb ${currentImage === idx ? 'active' : ''}`}
                                        onClick={() => setCurrentImage(idx)}
                                    >
                                        <img src={img.url} alt={`${product.name} ${idx + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details Section */}
                    <div className="product-details">
                        <div className="product-header">
                            <span className="category">{product.category}</span>
                            <h1>{product.name}</h1>
                            <div className="rating">
                                <span className="stars">{renderStars(product.rating?.average)}</span>
                                <span className="count">({product.rating?.count || 0} reviews)</span>
                            </div>
                        </div>

                        <p className="description">{product.description}</p>

                        <div className="price-section">
                            <span className="current-price">₹{formatPrice(product.price)}</span>
                            {product.originalPrice && (
                                <>
                                    <span className="original-price">₹{formatPrice(product.originalPrice)}</span>
                                    <span className="discount">
                                        {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Size Selection */}
                        <div className="option-section">
                            <h3>Size</h3>
                            <div className="size-options">
                                {product.sizes?.map(s => (
                                    <button
                                        key={s.size}
                                        className={`size-btn ${selectedSize === s.size ? 'active' : ''} ${s.stock === 0 ? 'disabled' : ''}`}
                                        onClick={() => s.stock > 0 && setSelectedSize(s.size)}
                                        disabled={s.stock === 0}
                                    >
                                        {s.size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div className="option-section">
                            <h3>Color</h3>
                            <div className="color-options">
                                {product.colors?.map(c => (
                                    <button
                                        key={c.name}
                                        className={`color-btn ${selectedColor === c.name ? 'active' : ''}`}
                                        style={{ backgroundColor: c.hex }}
                                        onClick={() => setSelectedColor(c.name)}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                            <span className="selected-color">{selectedColor}</span>
                        </div>

                        {/* Quantity */}
                        <div className="option-section">
                            <h3>Quantity</h3>
                            <div className="quantity-selector">
                                <button onClick={() => quantity > 1 && setQuantity(q => q - 1)}>
                                    <Icons.Minus size={16} />
                                </button>
                                <span>{quantity}</span>
                                <button onClick={() => setQuantity(q => q + 1)}>
                                    <Icons.Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Add to Cart */}
                        <div className="action-buttons">
                            <button
                                className={`add-to-cart-btn ${addedToCart ? 'added' : ''}`}
                                onClick={handleAddToCart}
                            >
                                {addedToCart ? (
                                    <><Icons.Check size={18} /> Added to Cart</>
                                ) : (
                                    <><Icons.ShoppingBag size={18} /> Add to Cart</>
                                )}
                            </button>
                            <button className="wishlist-btn">
                                <Icons.Heart size={22} />
                            </button>
                        </div>

                        {/* Features */}
                        <div className="features">
                            <div className="feature">
                                <span className="icon"><Icons.Truck size={18} color="#E87D6F" /></span>
                                <span>Free Delivery on orders above ₹999</span>
                            </div>
                            <div className="feature">
                                <span className="icon"><Icons.RefreshCw size={18} color="#E87D6F" /></span>
                                <span>Easy 7-day returns</span>
                            </div>
                            <div className="feature">
                                <span className="icon"><Icons.Shield size={18} color="#E87D6F" /></span>
                                <span>100% Authentic products</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
