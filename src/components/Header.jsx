import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Icons } from './Icons';
import { ROUTES, ANCHORS } from '../lib/routes';
import { initials, money } from '../lib/format';
import { FREE_SHIPPING_THRESHOLD } from '../lib/cart';
import styles from './Header.module.css';

/** Nav labels are unchanged from the previous build. What changed is that all
 *  four of them now actually go somewhere: Collections and About resolve to
 *  real homepage anchors, and Contact resolves to the footer, which is where
 *  the contact details actually live. */
const NAV = [
    { label: 'Shop', to: ROUTES.shop, kind: 'route' },
    { label: 'Collections', to: ANCHORS.collections, kind: 'anchor' },
    { label: 'About', to: ANCHORS.story, kind: 'anchor' },
    { label: 'Contact', to: ANCHORS.contact, kind: 'anchor' },
];

export default function Header() {
    const { cart, user, logout } = useCart();
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * One enum instead of three booleans: 'drawer' | 'menu' | 'search' | null.
     *
     * This makes it structurally impossible for two layers to be open at once
     * (the old build could show the search panel behind the mobile drawer), and
     * `openedAt` lets us *derive* the closed state on navigation rather than
     * synchronising it in an effect. Deriving also fixes the case an effect
     * would miss cheaply: browser back/forward while a layer is open, because
     * location.key changes on pops too.
     */
    const [openLayer, setOpenLayer] = useState(null);
    const [openedAt, setOpenedAt] = useState(location.key);
    const layer = openedAt === location.key ? openLayer : null;

    const [query, setQuery] = useState('');

    const menuRef = useRef(null);
    const menuButtonRef = useRef(null);
    const drawerRef = useRef(null);
    const drawerButtonRef = useRef(null);
    const searchInputRef = useRef(null);

    const count = cart?.totalItems || 0;

    const open = useCallback(
        (name) => {
            setOpenLayer(name);
            setOpenedAt(location.key);
        },
        [location.key]
    );

    const close = useCallback(() => setOpenLayer(null), []);

    const toggle = useCallback(
        (name) => {
            if (layer === name) close();
            else open(name);
        },
        [layer, open, close]
    );

    // Escape closes the open layer and returns focus to whatever opened it.
    useEffect(() => {
        if (!layer) return undefined;
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            close();
            if (layer === 'menu') menuButtonRef.current?.focus();
            if (layer === 'drawer') drawerButtonRef.current?.focus();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [layer, close]);

    // Click-outside for the account menu.
    // FIXED: the previous build opened this on :hover only, which made it
    // unreachable by keyboard and unusable on touch — and logout was the only
    // control inside it.
    useEffect(() => {
        if (layer !== 'menu') return undefined;
        const onDown = (e) => {
            if (
                !menuRef.current?.contains(e.target) &&
                !menuButtonRef.current?.contains(e.target)
            ) {
                close();
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [layer, close]);

    // Lock the page behind the drawer and move focus into it.
    useEffect(() => {
        if (layer !== 'drawer') return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        drawerRef.current?.querySelector('a, button')?.focus();
        return () => {
            document.body.style.overflow = previous;
        };
    }, [layer]);

    useEffect(() => {
        if (layer === 'search') searchInputRef.current?.focus();
    }, [layer]);

    const onSearch = useCallback(
        (e) => {
            e.preventDefault();
            const q = query.trim();
            if (!q) return;
            close();
            setQuery('');
            navigate(`${ROUTES.shop}?q=${encodeURIComponent(q)}`);
        },
        [query, navigate, close]
    );

    const handleLogout = useCallback(() => {
        close();
        logout();
        navigate(ROUTES.home);
    }, [logout, navigate, close]);

    const searchOpen = layer === 'search';
    const menuOpen = layer === 'menu';
    const drawerOpen = layer === 'drawer';

    return (
        <>
            {/* Real, useful facts rather than a decorative ribbon. Static: a
                fixed header is the wrong place for perpetual motion. */}
            <div className={styles.announce}>
                <span>Free delivery from {money(FREE_SHIPPING_THRESHOLD)}</span>
                <span className={styles.announceDot} aria-hidden="true">✳</span>
                <span>7-day returns</span>
                <span className={styles.announceDot} aria-hidden="true">✳</span>
                <span>Drop 01 shipping now</span>
            </div>

            <header className={styles.header}>
                <div className={styles.bar}>
                    {/* LOGO — printed in two passes, like everything else here.
                        The pink plate tracks --mis-x/--mis-y from press.js, so
                        the signature lives in the most-seen element on the site. */}
                    <Link to={ROUTES.home} className={styles.logo} aria-label="VYBE — home">
                        <span className={styles.logoGhost} aria-hidden="true">VYBE</span>
                        <span className={styles.logoInk}>VYBE</span>
                    </Link>

                    <nav className={styles.nav} aria-label="Main">
                        {NAV.map((item) =>
                            item.kind === 'route' ? (
                                <NavLink
                                    key={item.label}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        isActive
                                            ? `${styles.navLink} ${styles.navLinkActive}`
                                            : styles.navLink
                                    }
                                >
                                    {item.label}
                                </NavLink>
                            ) : (
                                <Link key={item.label} to={item.to} className={styles.navLink}>
                                    {item.label}
                                </Link>
                            )
                        )}
                    </nav>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label={searchOpen ? 'Close search' : 'Search products'}
                            aria-expanded={searchOpen}
                            aria-controls="header-search"
                            onClick={() => toggle('search')}
                        >
                            {searchOpen ? <Icons.X size={19} /> : <Icons.Search size={19} />}
                        </button>

                        <Link
                            to={ROUTES.cart}
                            className={styles.iconBtn}
                            aria-label={
                                count === 0
                                    ? 'Cart, empty'
                                    : `Cart, ${count} item${count === 1 ? '' : 's'}`
                            }
                        >
                            <Icons.Cart size={19} />
                            {count > 0 ? (
                                // key={count} remounts the badge whenever the
                                // number changes, which restarts the CSS stamp
                                // animation — no state, no timers, no effect.
                                <span key={count} className={styles.badge} aria-hidden="true">
                                    {count > 99 ? '99+' : count}
                                </span>
                            ) : null}
                        </Link>

                        {user ? (
                            <div className={styles.account}>
                                <button
                                    type="button"
                                    ref={menuButtonRef}
                                    className={styles.avatar}
                                    aria-expanded={menuOpen}
                                    aria-controls="account-menu"
                                    aria-haspopup="menu"
                                    onClick={() => toggle('menu')}
                                >
                                    {/* Initials — not the stock photograph of a
                                        stranger the old build used as every
                                        single user's avatar. */}
                                    <span aria-hidden="true">
                                        {initials(user.name, user.email)}
                                    </span>
                                    <span className="visuallyHidden">
                                        Account menu for {user.name || user.email}
                                    </span>
                                </button>

                                {menuOpen ? (
                                    <div
                                        className={styles.menu}
                                        id="account-menu"
                                        ref={menuRef}
                                        role="menu"
                                        onClick={close}
                                    >
                                        <p className={styles.menuHead}>
                                            <span className={styles.menuName}>
                                                {user.name || 'Your account'}
                                            </span>
                                            <span className={styles.menuMail}>{user.email}</span>
                                        </p>
                                        <Link
                                            to={ROUTES.orders}
                                            className={styles.menuItem}
                                            role="menuitem"
                                        >
                                            My orders
                                        </Link>
                                        <Link
                                            to={ROUTES.trackOrder}
                                            className={styles.menuItem}
                                            role="menuitem"
                                        >
                                            Track an order
                                        </Link>
                                        {user.role === 'admin' ? (
                                            <Link
                                                to={ROUTES.admin}
                                                className={styles.menuItem}
                                                role="menuitem"
                                            >
                                                Admin
                                            </Link>
                                        ) : null}
                                        <button
                                            type="button"
                                            className={styles.menuItem}
                                            role="menuitem"
                                            onClick={handleLogout}
                                        >
                                            Log out
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <Link to={ROUTES.login} className={styles.loginLink}>
                                Log in
                            </Link>
                        )}

                        <button
                            type="button"
                            ref={drawerButtonRef}
                            className={`${styles.iconBtn} ${styles.hamburger}`}
                            aria-label="Open menu"
                            aria-expanded={drawerOpen}
                            aria-controls="mobile-drawer"
                            onClick={() => open('drawer')}
                        >
                            <Icons.Menu size={21} />
                        </button>
                    </div>
                </div>

                {/* SEARCH — wired to the real /products/search endpoint. The old
                    build rendered this icon as pure decoration. */}
                <div className={styles.searchPanel} id="header-search" hidden={!searchOpen}>
                    <form className={styles.searchForm} onSubmit={onSearch} role="search">
                        <label className="visuallyHidden" htmlFor="header-search-input">
                            Search products
                        </label>
                        <input
                            id="header-search-input"
                            ref={searchInputRef}
                            className={styles.searchInput}
                            type="search"
                            value={query}
                            placeholder="jackets, cargos, caps…"
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button type="submit" className={styles.searchSubmit}>
                            Search
                        </button>
                    </form>
                </div>
            </header>

            {/* MOBILE DRAWER */}
            {drawerOpen ? (
                <div className={styles.scrim} role="presentation" onClick={close}>
                    <div
                        className={styles.drawer}
                        id="mobile-drawer"
                        ref={drawerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.drawerTop}>
                            <span className={styles.drawerMark}>VYBE</span>
                            <button
                                type="button"
                                className={styles.iconBtn}
                                aria-label="Close menu"
                                onClick={close}
                            >
                                <Icons.X size={21} />
                            </button>
                        </div>

                        {/* Any click on a link in here closes the drawer. Every
                            child is a navigation control, so delegating is
                            correct and avoids an onClick on each one. */}
                        <nav className={styles.drawerNav} aria-label="Mobile" onClick={close}>
                            {NAV.map((item) => (
                                <Link key={item.label} to={item.to} className={styles.drawerLink}>
                                    {item.label}
                                </Link>
                            ))}
                            <Link to={ROUTES.sizeGuide} className={styles.drawerLink}>
                                Size guide
                            </Link>
                            <Link to={ROUTES.trackOrder} className={styles.drawerLink}>
                                Track order
                            </Link>
                        </nav>

                        <div className={styles.drawerFoot} onClick={close}>
                            {user ? (
                                <>
                                    <Link to={ROUTES.orders} className={styles.drawerSmall}>
                                        My orders
                                    </Link>
                                    {user.role === 'admin' ? (
                                        <Link to={ROUTES.admin} className={styles.drawerSmall}>
                                            Admin
                                        </Link>
                                    ) : null}
                                    <button
                                        type="button"
                                        className={styles.drawerSmall}
                                        onClick={handleLogout}
                                    >
                                        Log out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to={ROUTES.login} className={styles.drawerSmall}>
                                        Log in
                                    </Link>
                                    <Link to={ROUTES.register} className={styles.drawerSmall}>
                                        Create account
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
