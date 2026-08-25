import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';
import ScrollManager from './components/ScrollManager';

import Hero from './components/Hero';
import Collections from './components/Collections';
import OurStory from './components/OurStory';
import CommunityHub from './components/CommunityHub';
import LimitedEdition from './components/LimitedEdition';

import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import Login from './pages/Login';
import Register from './pages/Register';
import Orders from './pages/Orders';
import TrackOrder from './pages/TrackOrder';
import NotFound from './pages/NotFound';

import FAQ from './pages/support/FAQ';
import Shipping from './pages/support/Shipping';
import Returns from './pages/support/Returns';
import SizeGuide from './pages/support/SizeGuide';
import Privacy from './pages/support/Privacy';
import Terms from './pages/support/Terms';

import AdminRoute from './components/AdminRoute';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';

import { CartProvider } from './context/CartProvider';
import { startPress } from './lib/press';
import { ROUTES } from './lib/routes';

/**
 * The app shell.
 *
 * Four things changed here, and each one removes a whole system:
 *
 *  1. `import './App.css'` is gone. It contained
 *     `.app > main > section { opacity: 0; animation: sectionFadeIn … }` with
 *     nth-child delays — a fifth, position-based motion system layered on top
 *     of the four others. It also meant any section that failed to match that
 *     selector stayed at opacity 0 permanently.
 *
 *  2. `useScrollReveal` / `useImageLoadClass` from hooks/usePageMotion are
 *     gone. They re-queried the document and re-attached observers on every
 *     pathname change. One shared IntersectionObserver in lib/useReveal now
 *     does the reveals, and Ink tracks its own load state per image.
 *
 *  3. ScrollToTop → ScrollManager. The old one ran `window.scrollTo(0, 0)` on
 *     every pathname change, which is why all seven anchor links in the header
 *     and footer appeared to do nothing.
 *
 *  4. startPress() is called. This is what drives --mis-x/--mis-y/--mis-a from
 *     scroll velocity, in one rAF loop for the whole page. Without this call
 *     every misregistered plate on the site sits at its static fallback offset.
 */

function HomePage() {
    return (
        <>
            <Hero />
            <Collections />
            <OurStory />
            <CommunityHub />
            <LimitedEdition />
        </>
    );
}

function Shell() {
    const { pathname } = useLocation();
    const isAdmin = pathname.startsWith(ROUTES.admin);

    return (
        <>
            {/* First tabbable element on the page. Styled in global.css and
                only visible once focused. */}
            <a className="skipLink" href="#main">
                Skip to content
            </a>

            {!isAdmin ? <Header /> : null}

            <main id="main">
                <Routes>
                    <Route path={ROUTES.home} element={<HomePage />} />
                    <Route path={ROUTES.shop} element={<Shop />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path={ROUTES.cart} element={<Cart />} />
                    <Route path={ROUTES.checkout} element={<Checkout />} />
                    <Route path={ROUTES.orderSuccess} element={<OrderSuccess />} />
                    <Route path={ROUTES.login} element={<Login />} />
                    <Route path={ROUTES.register} element={<Register />} />
                    <Route path={ROUTES.orders} element={<Orders />} />

                    {/* The eight routes the previous build linked to from the
                        footer and the account menu but never registered. Each one
                        rendered an empty <main> — header, footer, nothing between.
                        Paths come from ROUTES so a link and its route cannot
                        disagree about the spelling. */}
                    <Route path={ROUTES.trackOrder} element={<TrackOrder />} />
                    <Route path={ROUTES.faq} element={<FAQ />} />
                    <Route path={ROUTES.shipping} element={<Shipping />} />
                    <Route path={ROUTES.returns} element={<Returns />} />
                    <Route path={ROUTES.sizeGuide} element={<SizeGuide />} />
                    <Route path={ROUTES.privacy} element={<Privacy />} />
                    <Route path={ROUTES.terms} element={<Terms />} />

                    <Route path={ROUTES.admin} element={<AdminRoute />}>
                        <Route element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="products" element={<AdminProducts />} />
                            <Route path="orders" element={<AdminOrders />} />
                        </Route>
                    </Route>

                    {/* Anything unmatched gets a real page rather than an empty
                        <main>, which is what the previous build rendered for
                        every one of the eight paths it linked to but never
                        mounted. */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>

            {!isAdmin ? <Footer /> : null}
        </>
    );
}

export default function App() {
    // One frame loop for the whole site, started once and torn down on unmount.
    useEffect(() => startPress(), []);

    return (
        <CartProvider>
            <BrowserRouter>
                <ScrollManager />
                <Shell />
            </BrowserRouter>
        </CartProvider>
    );
}
