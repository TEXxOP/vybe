// ============================================================================
// API CLIENT
// Base URL comes from VITE_API_URL; falls back to the local backend.
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * An API failure that still carries the HTTP status, so callers can tell a
 * 404 (show "not found") from a 401 (send them to log in) from a 500.
 */
export class ApiError extends Error {
    constructor(message, status, body) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }
}

/**
 * Single fetch wrapper.
 *
 * FIXED: this used to call `await response.json()` unconditionally, which threw
 * an opaque SyntaxError on any 204 No Content, any empty body, and any HTML
 * error page served by a proxy — so a logged-out user hitting a protected route
 * saw "Unexpected token '<'" instead of anything actionable. We read the body
 * as text first and only parse it if there's something to parse.
 */
const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('vybe_token');

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch (err) {
        // An abort is not a failure — it is the caller saying it no longer
        // wants the answer. Shop aborts on every filter change, and wrapping
        // that in an ApiError would flash "Cannot reach the server" at a user
        // whose connection is perfectly fine. Rethrow untouched so callers can
        // recognise it by name and ignore it.
        if (err?.name === 'AbortError') throw err;

        // fetch only rejects on genuine network failure, so this is offline,
        // DNS, CORS preflight, or the backend simply not running.
        throw new ApiError(
            'Cannot reach the server. Check your connection and try again.',
            0,
            null
        );
    }

    const raw = await response.text();

    let data = null;
    if (raw) {
        try {
            data = JSON.parse(raw);
        } catch {
            // Not JSON — an HTML error page, a plain-text proxy message, etc.
            data = { message: raw.slice(0, 200) };
        }
    }

    if (!response.ok) {
        throw new ApiError(
            data?.message || `Request failed (${response.status})`,
            response.status,
            data
        );
    }

    // 204 and empty-body 200s resolve to {} rather than blowing up.
    return data ?? {};
};

// ============ AUTH ==========================================================
export const authAPI = {
    register: async (userData) => {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        if (data.token) {
            localStorage.setItem('vybe_token', data.token);
            localStorage.setItem('vybe_user', JSON.stringify(data.user));
        }
        return data;
    },

    login: async (credentials) => {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        if (data.token) {
            localStorage.setItem('vybe_token', data.token);
            localStorage.setItem('vybe_user', JSON.stringify(data.user));
        }
        return data;
    },

    logout: () => {
        localStorage.removeItem('vybe_token');
        localStorage.removeItem('vybe_user');
    },

    getMe: () => apiCall('/auth/me'),

    updateProfile: (data) =>
        apiCall('/auth/update-profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    isLoggedIn: () => !!localStorage.getItem('vybe_token'),

    /** Reads the cached user. Tolerates a corrupted localStorage entry rather
     *  than throwing during app boot and blanking the whole page. */
    getUser: () => {
        const user = localStorage.getItem('vybe_user');
        if (!user) return null;
        try {
            return JSON.parse(user);
        } catch {
            localStorage.removeItem('vybe_user');
            return null;
        }
    },
};

// ============ PRODUCTS ======================================================
export const productsAPI = {
    // `opts` is forwarded to fetch, which is how callers pass { signal }.
    // Without it, a fast sequence of filter clicks is a race whose winner is
    // whichever response happens to land last, not the one the user asked for.
    getAll: (params = {}, opts) => {
        // Drop empty values so we don't send ?category=&sort=
        const clean = Object.fromEntries(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ''
            )
        );
        const query = new URLSearchParams(clean).toString();
        return apiCall(`/products${query ? `?${query}` : ''}`, opts);
    },

    getById: (id, opts) => apiCall(`/products/${id}`, opts),

    getFeatured: (opts) => apiCall('/products/featured', opts),

    getLimited: (opts) => apiCall('/products/limited', opts),

    search: (query, opts) =>
        apiCall(`/products/search?q=${encodeURIComponent(query)}`, opts),

    getByCategory: (category) =>
        apiCall(`/products?category=${encodeURIComponent(category)}`),

    getByCollection: (collection) =>
        apiCall(`/products?collection=${encodeURIComponent(collection)}`),
};

// ============ CART ==========================================================
export const cartAPI = {
    get: () => apiCall('/cart'),

    add: (productId, quantity = 1, size, color) =>
        apiCall('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity, size, color }),
        }),

    update: (itemId, quantity) =>
        apiCall(`/cart/update/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity }),
        }),

    remove: (itemId) => apiCall(`/cart/remove/${itemId}`, { method: 'DELETE' }),

    clear: () => apiCall('/cart/clear', { method: 'DELETE' }),
};

// ============ ORDERS ========================================================
export const ordersAPI = {
    create: (orderData) =>
        apiCall('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        }),

    /** `options` is forwarded to fetch, so callers can pass an AbortController
     *  signal. /orders and /track-order both do — an order list request left
     *  in flight after the user navigates away resolves into an unmounted
     *  component. */
    getMyOrders: (options) => apiCall('/orders/my-orders', options),

    getById: (id) => apiCall(`/orders/${id}`),

    cancel: (id, reason) =>
        apiCall(`/orders/${id}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ reason }),
        }),
};

// ============ ADMIN =========================================================
export const adminAPI = {
    /** No dedicated stats endpoint exists yet, so this aggregates client-side.
     *  Worth moving server-side once the order count gets large.
     *
     *  `options` is forwarded to both calls so the pair can be aborted together:
     *  the dashboard fires this on mount, and an admin who clicks straight
     *  through to Products shouldn't leave two requests resolving into a page
     *  that no longer exists. */
    getStats: async (options) => {
        const [ordersData, productsData] = await Promise.all([
            apiCall('/orders', options),
            apiCall('/products?limit=1000', options),
        ]);

        const orders = ordersData.orders || [];
        const products = productsData.products || [];

        const totalRevenue = orders.reduce(
            (sum, order) => sum + (order.totalPrice || 0),
            0
        );

        return {
            totalOrders: orders.length,
            totalProducts: products.length,
            totalRevenue,
            orders,
            products,
        };
    },

    getAllOrders: (options) => apiCall('/orders', options),

    updateOrderStatus: (orderId, status) =>
        apiCall(`/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        }),

    createProduct: (productData) =>
        apiCall('/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        }),

    updateProduct: (productId, productData) =>
        apiCall(`/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData),
        }),

    deleteProduct: (productId) =>
        apiCall(`/products/${productId}`, { method: 'DELETE' }),
};

const api = {
    auth: authAPI,
    products: productsAPI,
    cart: cartAPI,
    orders: ordersAPI,
    admin: adminAPI,
};

export default api;
