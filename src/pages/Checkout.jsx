import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ordersAPI, authAPI } from '../services/api';
import { Icons } from '../components/Icons';
import './Checkout.css';

const Checkout = () => {
    const { cart, clearCart, user } = useCart();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cod');

    const [address, setAddress] = useState({
        name: user?.name || '',
        phone: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
    });

    const [errors, setErrors] = useState({});

    const formatPrice = (price) => price.toLocaleString('en-IN');

    const subtotal = cart.totalPrice || 0;
    const shipping = subtotal >= 999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shipping + tax;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setAddress(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!address.name.trim()) newErrors.name = 'Name is required';
        if (!address.phone.trim()) newErrors.phone = 'Phone is required';
        if (!/^\d{10}$/.test(address.phone)) newErrors.phone = 'Enter valid 10-digit phone';
        if (!address.street.trim()) newErrors.street = 'Address is required';
        if (!address.city.trim()) newErrors.city = 'City is required';
        if (!address.state.trim()) newErrors.state = 'State is required';
        if (!address.pincode.trim()) newErrors.pincode = 'Pincode is required';
        if (!/^\d{6}$/.test(address.pincode)) newErrors.pincode = 'Enter valid 6-digit pincode';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePlaceOrder = async () => {
        if (!validateForm()) return;

        if (!authAPI.isLoggedIn()) {
            // Guest checkout - just simulate order
            const orderNumber = 'ORD' + Date.now().toString().slice(-8);
            clearCart();
            navigate('/order-success', {
                state: {
                    orderNumber,
                    total,
                    paymentMethod
                }
            });
            return;
        }

        try {
            setLoading(true);
            const orderData = {
                shippingAddress: address,
                paymentMethod
            };
            const data = await ordersAPI.create(orderData);
            clearCart();
            navigate('/order-success', {
                state: {
                    orderNumber: data.order.orderNumber,
                    total,
                    paymentMethod
                }
            });
        } catch (error) {
            console.error('Failed to place order:', error);
            alert('Failed to place order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (cart.items.length === 0) {
        navigate('/cart');
        return null;
    }

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <h1>Checkout</h1>

                <div className="checkout-content">
                    {/* Left - Forms */}
                    <div className="checkout-forms">
                        {/* Shipping Address */}
                        <div className="form-section">
                            <h2><Icons.MapPin size={20} color="#E87D6F" /> Shipping Address</h2>
                            <div className="form-grid">
                                <div className="form-group full">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={address.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                        className={errors.name ? 'error' : ''}
                                    />
                                    {errors.name && <span className="error-msg">{errors.name}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={address.phone}
                                        onChange={handleInputChange}
                                        placeholder="10-digit mobile number"
                                        className={errors.phone ? 'error' : ''}
                                    />
                                    {errors.phone && <span className="error-msg">{errors.phone}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Pincode *</label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        value={address.pincode}
                                        onChange={handleInputChange}
                                        placeholder="6-digit pincode"
                                        className={errors.pincode ? 'error' : ''}
                                    />
                                    {errors.pincode && <span className="error-msg">{errors.pincode}</span>}
                                </div>

                                <div className="form-group full">
                                    <label>Street Address *</label>
                                    <textarea
                                        name="street"
                                        value={address.street}
                                        onChange={handleInputChange}
                                        placeholder="House no., Building, Street, Area"
                                        rows="3"
                                        className={errors.street ? 'error' : ''}
                                    />
                                    {errors.street && <span className="error-msg">{errors.street}</span>}
                                </div>

                                <div className="form-group">
                                    <label>City *</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={address.city}
                                        onChange={handleInputChange}
                                        placeholder="City"
                                        className={errors.city ? 'error' : ''}
                                    />
                                    {errors.city && <span className="error-msg">{errors.city}</span>}
                                </div>

                                <div className="form-group">
                                    <label>State *</label>
                                    <select
                                        name="state"
                                        value={address.state}
                                        onChange={handleInputChange}
                                        className={errors.state ? 'error' : ''}
                                    >
                                        <option value="">Select State</option>
                                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                                        <option value="Delhi">Delhi</option>
                                        <option value="Gujarat">Gujarat</option>
                                        <option value="Karnataka">Karnataka</option>
                                        <option value="Maharashtra">Maharashtra</option>
                                        <option value="Punjab">Punjab</option>
                                        <option value="Rajasthan">Rajasthan</option>
                                        <option value="Tamil Nadu">Tamil Nadu</option>
                                        <option value="Telangana">Telangana</option>
                                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                                        <option value="West Bengal">West Bengal</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {errors.state && <span className="error-msg">{errors.state}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="form-section">
                            <h2><Icons.CreditCard size={20} color="#E87D6F" /> Payment Method</h2>
                            <div className="payment-options">
                                <label className={`payment-option ${paymentMethod === 'cod' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <span className="icon"><Icons.Cash size={28} color="#E87D6F" /></span>
                                    <div className="info">
                                        <strong>Cash on Delivery</strong>
                                        <span>Pay when you receive</span>
                                    </div>
                                </label>

                                <label className={`payment-option ${paymentMethod === 'upi' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="upi"
                                        checked={paymentMethod === 'upi'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <span className="icon"><Icons.Smartphone size={28} color="#E87D6F" /></span>
                                    <div className="info">
                                        <strong>UPI</strong>
                                        <span>GPay, PhonePe, Paytm</span>
                                    </div>
                                </label>

                                <label className={`payment-option ${paymentMethod === 'card' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="card"
                                        checked={paymentMethod === 'card'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <span className="icon"><Icons.CreditCard size={28} color="#E87D6F" /></span>
                                    <div className="info">
                                        <strong>Credit/Debit Card</strong>
                                        <span>Visa, Mastercard, RuPay</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right - Order Summary */}
                    <div className="order-summary">
                        <h2>Order Summary</h2>

                        <div className="order-items">
                            {cart.items.map(item => (
                                <div key={item._id} className="order-item">
                                    <div className="item-img">
                                        <img src={item.product?.images?.[0]?.url} alt={item.product?.name} />
                                        <span className="qty">{item.quantity}</span>
                                    </div>
                                    <div className="item-info">
                                        <h4>{item.product?.name}</h4>
                                        <span>{item.size} / {item.color}</span>
                                    </div>
                                    <span className="item-price">₹{formatPrice(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="summary-details">
                            <div className="row">
                                <span>Subtotal</span>
                                <span>₹{formatPrice(subtotal)}</span>
                            </div>
                            <div className="row">
                                <span>Shipping</span>
                                <span className={shipping === 0 ? 'free' : ''}>
                                    {shipping === 0 ? 'FREE' : `₹${shipping}`}
                                </span>
                            </div>
                            <div className="row">
                                <span>Tax (18% GST)</span>
                                <span>₹{formatPrice(tax)}</span>
                            </div>
                            <div className="row total">
                                <span>Total</span>
                                <span>₹{formatPrice(total)}</span>
                            </div>
                        </div>

                        <button
                            className="place-order-btn"
                            onClick={handlePlaceOrder}
                            disabled={loading}
                        >
                            {loading ? 'Placing Order...' : `Place Order • ₹${formatPrice(total)}`}
                        </button>

                        <p className="secure-note">
                            <Icons.Lock size={14} /> Your payment information is secure
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
