import { Navigate, Outlet } from 'react-router-dom';

import { useCart } from '../context/CartContext';
import { ROUTES } from '../lib/routes';
import styles from './AdminRoute.module.css';

/**
 * ADMIN ACCESS GUARD.
 *
 * THE BUG THIS FIXES IS THE WHOLE REASON THIS FILE CHANGED. It read `loading`
 * off the cart context:
 *
 *     const { user, loading } = useCart();
 *     if (loading) return <div>Verifying Admin Access...</div>;
 *     if (!user) return <Navigate to="/" replace />;
 *
 * `loading` is an alias for `cartLoading` — whether the *shopping cart* has
 * finished loading. It says nothing about whether the auth check has run. So on
 * a fresh page load at /admin the sequence was: cartLoading false, authReady
 * still false, `user` still null → redirect to the homepage. Refreshing the
 * admin panel, or opening a bookmark to it, threw you out every single time. The
 * only way in was to click through from a session where auth had already
 * resolved. The gate wasn't too weak, it was watching the wrong clock.
 *
 * `authReady` is the flag that means "we have finished asking who you are".
 *
 * Two smaller things:
 *
 *  - Five console.log calls are gone, one of which printed the entire user
 *    object — email, role and all — into the console on every render.
 *
 *  - The waiting state was an inline style object with a 50px pad and a 20px
 *    font. It's a class now, and it announces itself: a screen reader user
 *    otherwise gets silence during the auth round trip.
 *
 * A non-admin is sent home rather than shown "access denied". There's nothing
 * useful to offer them here, and confirming that /admin exists and is merely
 * locked is information this page doesn't need to volunteer.
 */
export default function AdminRoute() {
    const { user, authReady } = useCart();

    if (!authReady) {
        return (
            <p className={styles.waiting} aria-live="polite">
                Checking your access…
            </p>
        );
    }

    if (!user || user.role !== 'admin') {
        return <Navigate to={ROUTES.home} replace />;
    }

    return <Outlet />;
}
