import { Navigate, Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const AdminRoute = () => {
    const { user, loading } = useCart();

    console.log('AdminRoute: Checking access', { user, loading });

    if (loading) {
        return (
            <div style={{ padding: '50px', textAlign: 'center', fontSize: '20px' }}>
                Verifying Admin Access...
            </div>
        );
    }

    if (!user) {
        console.log('AdminRoute: No user found, redirecting');
        return <Navigate to="/" replace />;
    }

    if (user.role !== 'admin') {
        console.log('AdminRoute: User role is not admin', user.role);
        return <Navigate to="/" replace />;
    }

    console.log('AdminRoute: Access granted');
    return <Outlet />;
};

export default AdminRoute;
