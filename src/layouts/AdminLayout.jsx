import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useCart } from '../context/CartContext';
import { Icons } from '../components/Icons';
import { ROUTES } from '../lib/routes';
import styles from './AdminLayout.module.css';

/**
 * ADMIN LAYOUT.
 *
 * Four fixes here, one of them a real accessibility bug:
 *
 *  1. `<main className="admin-content">` WAS A SECOND <main>. App.jsx already
 *     wraps every route in <main id="main">, so every admin page shipped two
 *     main landmarks. A document may have one. The skip link becomes ambiguous
 *     and a screen reader offers two "main" regions with no way to tell which
 *     is the real one. It's a <div> now — same as the fix Login and Register
 *     needed.
 *
 *  2. THE PAGE TITLE WAS HARDCODED to "Admin Dashboard" in the layout, so
 *     /admin/products and /admin/orders both announced themselves as the
 *     dashboard. The <h1> is the first thing a screen reader user hears and the
 *     thing a browser tab is named after; on two of three pages it was wrong.
 *     It's derived from the path now.
 *
 *  3. `console.log('AdminLayout: Rendering')` on every render, gone.
 *
 *  4. Paths were hardcoded strings — '/admin', '/admin/products', '/'. They come
 *     from ROUTES now, so a nav link and its route can't disagree about
 *     spelling. That is precisely how the previous build ended up with eight
 *     footer links pointing at routes that were never mounted.
 *
 * The active nav state is left to NavLink's own aria-current="page" and styled
 * from the attribute, rather than a className callback adding a parallel
 * `.active` class. One fact, one source: the highlight and the announcement
 * can't disagree.
 */

/* Also the order they appear in the nav. Adding a section means adding one
   entry, and its title, breadcrumb and link all follow. */
const SECTIONS = [
    {
        to: ROUTES.admin,
        end: true,
        icon: Icons.Grid,
        label: 'Dashboard',
        plate: 'Plate 01 · overview',
        title: 'The run so far',
    },
    {
        to: ROUTES.adminProducts,
        icon: Icons.ShoppingBag,
        label: 'Products',
        plate: 'Plate 02 · catalogue',
        title: 'What’s in print',
    },
    {
        to: ROUTES.adminOrders,
        icon: Icons.Package,
        label: 'Orders',
        plate: 'Plate 03 · dockets',
        title: 'Orders',
    },
];

export default function AdminLayout() {
    const { logout } = useCart();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    /* Longest match wins, so /admin/products isn't shadowed by /admin. Falls
       back to the first section rather than rendering an empty heading. */
    const active =
        [...SECTIONS]
            .sort((a, b) => b.to.length - a.to.length)
            .find((s) => pathname === s.to || pathname.startsWith(`${s.to}/`)) ||
        SECTIONS[0];

    const signOut = () => {
        logout();
        navigate(ROUTES.home);
    };

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <Link className={styles.wordmark} to={ROUTES.home}>
                        VYBE
                    </Link>
                    <span className={styles.badge}>Press room</span>
                </div>

                <nav className={styles.nav} aria-label="Admin sections">
                    {SECTIONS.map(({ to, end, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={styles.navItem}
                        >
                            <Icon size={16} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className={styles.sideFoot}>
                    <Link className={styles.viewShop} to={ROUTES.home}>
                        <Icons.ArrowLeft size={13} /> View the shop
                    </Link>
                    <button
                        type="button"
                        className={styles.logout}
                        onClick={signOut}
                    >
                        <Icons.LogOut size={13} /> Sign out
                    </button>
                </div>
            </aside>

            {/* A <div>, not a <main>. See note 1 above. */}
            <div className={styles.content}>
                <header className={styles.bar}>
                    <p className={styles.eyebrow}>{active.plate}</p>
                    <h1 className={styles.title}>{active.title}</h1>
                </header>

                <div className={styles.body}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
