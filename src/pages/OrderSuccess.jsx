import { useLocation, Link, Navigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import './OrderSuccess.css';

const OrderSuccess = () => {
    const location = useLocation();
    const { orderNumber, total, paymentMethod } = location.state || {};

    if (!orderNumber) {
        return <Navigate to="/" replace />;
    }

    const formatPrice = (price) => price?.toLocaleString('en-IN') || '0';

    const getPaymentText = () => {
        switch (paymentMethod) {
            case 'cod': return 'Cash on Delivery';
            case 'upi': return 'UPI Payment';
            case 'card': return 'Card Payment';
            default: return paymentMethod;
        }
    };

    return (
        <div className="order-success-page">
            <div className="success-card">
                <div className="success-icon">
                    <Icons.Check size={40} color="white" />
                </div>
                <h1>Order Placed Successfully!</h1>
                <p className="order-number">Order Number: <strong>{orderNumber}</strong></p>

                <div className="order-info">
                    <div className="info-row">
                        <span>Amount Paid</span>
                        <span className="amount">₹{formatPrice(total)}</span>
                    </div>
                    <div className="info-row">
                        <span>Payment Method</span>
                        <span>{getPaymentText()}</span>
                    </div>
                </div>

                <div className="what-next">
                    <h3>What's Next?</h3>
                    <div className="steps">
                        <div className="step">
                            <span className="step-icon"><Icons.Package size={24} color="#E87D6F" /></span>
                            <div>
                                <strong>Order Confirmation</strong>
                                <p>You'll receive an email with order details</p>
                            </div>
                        </div>
                        <div className="step">
                            <span className="step-icon"><Icons.Truck size={24} color="#E87D6F" /></span>
                            <div>
                                <strong>Shipping</strong>
                                <p>Your order will be shipped within 2-3 days</p>
                            </div>
                        </div>
                        <div className="step">
                            <span className="step-icon"><Icons.Eye size={24} color="#E87D6F" /></span>
                            <div>
                                <strong>Track Order</strong>
                                <p>You can track your order status anytime</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="actions">
                    <Link to="/shop" className="continue-btn">
                        Continue Shopping
                    </Link>
                    <Link to="/" className="home-btn">
                        Back to Home
                    </Link>
                </div>

                <p className="thank-you">
                    Thank you for shopping with VYBE! <span className="heart"><Icons.Heart size={16} color="#E87D6F" filled /></span>
                </p>
            </div>
        </div>
    );
};

export default OrderSuccess;
