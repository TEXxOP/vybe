/**
 * The single route manifest.
 *
 * Every path in the app is declared exactly once, here. Components link via
 * ROUTES.x instead of typing string literals, which is how we make it
 * structurally impossible to ship the previous build's eight dead links —
 * the seven Customer Support links in the footer and /orders in the header
 * all pointed at routes that were never registered and rendered blank pages.
 *
 * scripts/check-routes.mjs asserts that every path referenced in JSX appears
 * in STATIC_PATHS (or is produced by one of the builders below), and that
 * every path here is actually mounted in App.jsx.
 */

export const ROUTES = {
  // Storefront
  home: '/',
  shop: '/shop',
  product: (id) => `/product/${id}`,
  cart: '/cart',
  checkout: '/checkout',
  orderSuccess: '/order-success',

  // Account
  login: '/login',
  register: '/register',
  orders: '/orders',

  // Customer support — these were all dead before
  faq: '/faq',
  shipping: '/shipping',
  returns: '/returns',
  sizeGuide: '/size-guide',
  trackOrder: '/track-order',
  privacy: '/privacy',
  terms: '/terms',

  // Admin
  admin: '/admin',
  adminProducts: '/admin/products',
  adminOrders: '/admin/orders',
};

/** Homepage section anchors. Real scroll targets, not decoration.
 *  `contact` resolves to the footer, which carries id="contact" — it is a
 *  section of the page rather than a page of its own, so it belongs here and not
 *  in ROUTES. It was the one anchor both nav lists hardcoded as '/#contact'
 *  while using ANCHORS for their other four. */
export const ANCHORS = {
  collections: '/#collections',
  story: '/#story',
  community: '/#community',
  drops: '/#drops',
  contact: '/#contact',
};

/** Shop filtered by category — Collections cards deep-link through this.
 *  The previous Shop.jsx never read useSearchParams, so every one of these
 *  links silently landed on an unfiltered grid. */
export const shopCategory = (slug) =>
  slug && slug !== 'all' ? `/shop?category=${encodeURIComponent(slug)}` : '/shop';

/** Flat list of every static path, for the integrity checker. */
export const STATIC_PATHS = Object.values(ROUTES).filter(
  (v) => typeof v === 'string'
);
