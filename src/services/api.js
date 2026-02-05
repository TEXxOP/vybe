// API Configuration
// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('vybe_token');

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// ============ AUTH API ============
export const authAPI = {
    register: async (userData) => {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
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
            body: JSON.stringify(credentials)
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

    updateProfile: (data) => apiCall('/auth/update-profile', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    isLoggedIn: () => !!localStorage.getItem('vybe_token'),

    getUser: () => {
        const user = localStorage.getItem('vybe_user');
        return user ? JSON.parse(user) : null;
    }
};

// ============ PRODUCTS API ============
export const productsAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiCall(`/products${query ? `?${query}` : ''}`);
    },

    getById: (id) => apiCall(`/products/${id}`),

    getFeatured: () => apiCall('/products/featured'),

    getLimited: () => apiCall('/products/limited'),

    search: (query) => apiCall(`/products/search?q=${encodeURIComponent(query)}`),

    getByCategory: (category) => apiCall(`/products?category=${category}`),

    getByCollection: (collection) => apiCall(`/products?collection=${collection}`)
};

// ============ CART API ============
export const cartAPI = {
    get: () => apiCall('/cart'),

    add: (productId, quantity = 1, size, color) => apiCall('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity, size, color })
    }),

    update: (itemId, quantity) => apiCall(`/cart/update/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
    }),

    remove: (itemId) => apiCall(`/cart/remove/${itemId}`, {
        method: 'DELETE'
    }),

    clear: () => apiCall('/cart/clear', {
        method: 'DELETE'
    })
};

// ============ ORDERS API ============
export const ordersAPI = {
    create: (orderData) => apiCall('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    }),

    getMyOrders: () => apiCall('/orders/my-orders'),

    getById: (id) => apiCall(`/orders/${id}`),

    cancel: (id, reason) => apiCall(`/orders/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
    })
};

// ============ ADMIN API ============
export const adminAPI = {
    // Dashboard Stats
    getStats: async () => {
        // Since there is no dedicated stats endpoint yet, we fetch orders and products to calculate
        const [ordersData, productsData] = await Promise.all([
            apiCall('/orders'), // Admin route gets all orders
            apiCall('/products?limit=1000') // Get all products
        ]);

        const orders = ordersData.orders || [];
        const products = productsData.products || [];

        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

        return {
            totalOrders: orders.length,
            totalProducts: products.length,
            totalRevenue,
            orders,
            products
        };
    },

    // Order Management
    getAllOrders: () => apiCall('/orders'),

    updateOrderStatus: (orderId, status) => apiCall(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    }),

    // Product Management
    createProduct: (productData) => apiCall('/products', {
        method: 'POST',
        body: JSON.stringify(productData)
    }),

    updateProduct: (productId, productData) => apiCall(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
    }),

    deleteProduct: (productId) => apiCall(`/products/${productId}`, {
        method: 'DELETE'
    })
};

export default {
    auth: authAPI,
    products: productsAPI,
    cart: cartAPI,
    orders: ordersAPI,
    admin: adminAPI
};
