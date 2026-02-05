import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Icons } from '../components/Icons';
import './AdminLayout.css';

const AdminLayout = () => {
    const { logout } = useCart();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    console.log('AdminLayout: Rendering');

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <Link to="/" className="brand-logo">VYBE</Link>
                    <span className="brand-badge">ADMIN</span>
                </div>

                <nav className="admin-nav">
                    <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Icons.Grid size={20} />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/admin/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Icons.ShoppingBag size={20} />
                        <span>Products</span>
                    </NavLink>
                    <NavLink to="/admin/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Icons.Package size={20} />
                        <span>Orders</span>
                    </NavLink>
                </nav>

                <div className="admin-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        <Icons.LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-content">
                <header className="admin-header">
                    <h2 className="page-title">Admin Dashboard</h2>
                    <div className="header-actions">
                        <Link to="/" className="view-shop-btn">
                            View Shop
                            <Icons.ArrowRight size={16} />
                        </Link>
                    </div>
                </header>
                <div className="content-wrapper">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
