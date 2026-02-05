import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Icons } from '../components/Icons';
import './Cart.css';

const Cart = () => {
    const { cart, updateQuantity, removeFromCart } = useCart();
    const navigate = useNavigate();

    const formatPrice = (price) => price.toLocaleString('en-IN');

    const subtotal = cart.totalPrice || 0;
    const shipping = subtotal >= 999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shipping + tax;

    if (cart.items.length === 0) {
        return (
            <div className="cart-page empty">
                <div className="empty-cart">
                    <span className="empty-icon"><Icons.ShoppingBag size={64} color="#E87D6F" /></span>
                    <h2>Your cart is empty</h2>
                    <p>Looks like you haven't added anything to your cart yet.</p>
                    <Link to="/shop" className="continue-btn">
                        Continue Shopping
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="cart-container">
                <h1>Shopping Cart</h1>
                <p className="item-count">{cart.totalItems} items in your cart</p>

                <div className="cart-content">
                    {/* Cart Items */}
                    <div className="cart-items">
                        {cart.items.map(item => (
                            <div key={item._id} className="cart-item">
                                <div className="item-image">
                                    <img
                                        src={item.product?.images?.[0]?.url || 'https://via.placeholder.com/120'}
                                        alt={item.product?.name}
                                    />
                                </div>
                                <div className="item-details">
                                    <h3>{item.product?.name}</h3>
                                    <div className="item-meta">
                                        <span className="size">Size: {item.size}</span>
                                        <span className="color">Color: {item.color}</span>
                                    </div>
                                    <span className="item-price">₹{formatPrice(item.price)}</span>
                                </div>
                                <div className="item-quantity">
                                    <button
                                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                    >
                                        <Icons.Minus size={14} />
                                    </button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                                        <Icons.Plus size={14} />
                                    </button>
                                </div>
                                <div className="item-total">
                                    ₹{formatPrice(item.price * item.quantity)}
                                </div>
                                <button
                                    className="remove-btn"
                                    onClick={() => removeFromCart(item._id)}
                                >
                                    <Icons.X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="order-summary">
                        <h2>Order Summary</h2>

                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>₹{formatPrice(subtotal)}</span>
                        </div>

                        <div className="summary-row">
                            <span>Shipping</span>
                            <span className={shipping === 0 ? 'free' : ''}>
                                {shipping === 0 ? 'FREE' : `₹${shipping}`}
                            </span>
                        </div>

                        <div className="summary-row">
                            <span>Tax (18% GST)</span>
                            <span>₹{formatPrice(tax)}</span>
                        </div>

                        {shipping > 0 && (
                            <div className="free-shipping-note">
                                Add ₹{formatPrice(999 - subtotal)} more for free shipping!
                            </div>
                        )}

                        <div className="summary-total">
                            <span>Total</span>
                            <span>₹{formatPrice(total)}</span>
                        </div>

                        <button
                            className="checkout-btn"
                            onClick={() => navigate('/checkout')}
                        >
                            Proceed to Checkout <Icons.ArrowRight size={16} />
                        </button>

                        <Link to="/shop" className="continue-shopping">
                            <Icons.ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Continue Shopping
                        </Link>

                        <div className="payment-methods">
                            <span>We accept:</span>
                            <div className="methods">
                                <span><Icons.CreditCard size={16} /> Card</span>
                                <span><Icons.Smartphone size={16} /> UPI</span>
                                <span><Icons.Cash size={16} /> COD</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
