import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Icons } from '../../components/Icons';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        recentOrders: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await adminAPI.getStats();
                setStats({
                    totalRevenue: data.totalRevenue,
                    totalOrders: data.totalOrders,
                    totalProducts: data.totalProducts,
                    recentOrders: data.orders.slice(0, 5) // Last 5 orders
                });
            } catch (error) {
                console.error('Failed to fetch admin stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'delivered': return 'green';
            case 'shipped': return 'blue';
            case 'processing': return 'orange';
            case 'cancelled': return 'red';
            default: return 'gray';
        }
    };

    if (loading) return <div className="admin-loading">Loading stats...</div>;

    return (
        <div className="admin-dashboard">
            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon revenue">
                        <Icons.TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Total Revenue</span>
                        <h3 className="stat-value">{formatCurrency(stats.totalRevenue)}</h3>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orders">
                        <Icons.Package size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Total Orders</span>
                        <h3 className="stat-value">{stats.totalOrders}</h3>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon products">
                        <Icons.ShoppingBag size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Active Products</span>
                        <h3 className="stat-value">{stats.totalProducts}</h3>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-orders-section">
                <h3>Recent Orders</h3>
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentOrders.length > 0 ? (
                                stats.recentOrders.map(order => (
                                    <tr key={order._id}>
                                        <td className="order-id">#{order._id.slice(-6).toUpperCase()}</td>
                                        <td>{order.user?.name || 'Guest'}</td>
                                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`status-badge ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="order-total">{formatCurrency(order.totalPrice)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="empty-table">No orders yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
