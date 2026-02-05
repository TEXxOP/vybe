import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './AdminTable.css';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const data = await adminAPI.getAllOrders();
            setOrders(data.orders || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await adminAPI.updateOrderStatus(id, newStatus);
            setOrders(orders.map(o =>
                o._id === id ? { ...o, status: newStatus } : o
            ));
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    if (loading) return <div className="admin-loading">Loading orders...</div>;

    return (
        <div className="admin-page">
            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order._id}>
                                <td className="order-id">#{order._id.slice(-6).toUpperCase()}</td>
                                <td>
                                    <div className="customer-info">
                                        <div className="font-medium">{order.user?.name || 'Guest'}</div>
                                        <div className="text-small">{order.user?.email || order.shippingAddress.email}</div>
                                    </div>
                                </td>
                                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td>{order.items.length} items</td>
                                <td className="font-medium">{formatPrice(order.totalPrice)}</td>
                                <td>
                                    <select
                                        className={`status-select ${order.status}`}
                                        value={order.status}
                                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                                    >
                                        <option value="processing">Processing</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </td>
                                <td>
                                    <button className="view-btn">View Details</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminOrders;
