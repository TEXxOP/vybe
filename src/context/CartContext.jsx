import { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI, authAPI } from '../services/api';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState({ items: [], totalItems: 0, totalPrice: 0 });
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);

    // Check for existing user on mount
    useEffect(() => {
        const savedUser = authAPI.getUser();
        if (savedUser) {
            setUser(savedUser);
            fetchCart();
        } else {
            // Load cart from localStorage for guests
            const localCart = localStorage.getItem('vybe_guest_cart');
            if (localCart) {
                setCart(JSON.parse(localCart));
            }
        }
    }, []);

    // Save guest cart to localStorage
    useEffect(() => {
        if (!user) {
            localStorage.setItem('vybe_guest_cart', JSON.stringify(cart));
        }
    }, [cart, user]);

    const fetchCart = async () => {
        if (!authAPI.isLoggedIn()) return;
        try {
            setLoading(true);
            const data = await cartAPI.get();
            setCart(data.cart);
        } catch (error) {
            console.error('Failed to fetch cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (product, quantity = 1, size, color) => {
        const newItem = {
            _id: `${product._id}-${size}-${color}`,
            product: {
                _id: product._id,
                name: product.name,
                price: product.price,
                images: product.images
            },
            quantity,
            size,
            color,
            price: product.price
        };

        if (authAPI.isLoggedIn()) {
            try {
                setLoading(true);
                const data = await cartAPI.add(product._id, quantity, size, color);
                setCart(data.cart);
            } catch (error) {
                console.error('Failed to add to cart:', error);
            } finally {
                setLoading(false);
            }
        } else {
            // Guest cart - store locally
            setCart(prev => {
                const existingIndex = prev.items.findIndex(
                    item => item.product._id === product._id &&
                        item.size === size &&
                        item.color === color
                );

                let newItems;
                if (existingIndex > -1) {
                    newItems = [...prev.items];
                    newItems[existingIndex].quantity += quantity;
                } else {
                    newItems = [...prev.items, newItem];
                }

                const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
                const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                return { items: newItems, totalItems, totalPrice };
            });
        }
    };

    const updateQuantity = async (itemId, quantity) => {
        if (authAPI.isLoggedIn()) {
            try {
                const data = await cartAPI.update(itemId, quantity);
                setCart(data.cart);
            } catch (error) {
                console.error('Failed to update cart:', error);
            }
        } else {
            setCart(prev => {
                let newItems;
                if (quantity <= 0) {
                    newItems = prev.items.filter(item => item._id !== itemId);
                } else {
                    newItems = prev.items.map(item =>
                        item._id === itemId ? { ...item, quantity } : item
                    );
                }
                const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
                const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                return { items: newItems, totalItems, totalPrice };
            });
        }
    };

    const removeFromCart = async (itemId) => {
        if (authAPI.isLoggedIn()) {
            try {
                const data = await cartAPI.remove(itemId);
                setCart(data.cart);
            } catch (error) {
                console.error('Failed to remove from cart:', error);
            }
        } else {
            setCart(prev => {
                const newItems = prev.items.filter(item => item._id !== itemId);
                const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
                const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                return { items: newItems, totalItems, totalPrice };
            });
        }
    };

    const clearCart = async () => {
        if (authAPI.isLoggedIn()) {
            try {
                await cartAPI.clear();
                setCart({ items: [], totalItems: 0, totalPrice: 0 });
            } catch (error) {
                console.error('Failed to clear cart:', error);
            }
        } else {
            setCart({ items: [], totalItems: 0, totalPrice: 0 });
        }
    };

    const login = async (credentials) => {
        const data = await authAPI.login(credentials);
        setUser(data.user);
        await fetchCart();
        return data;
    };

    const register = async (userData) => {
        const data = await authAPI.register(userData);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        authAPI.logout();
        setUser(null);
        setCart({ items: [], totalItems: 0, totalPrice: 0 });
    };

    return (
        <CartContext.Provider value={{
            cart,
            user,
            loading,
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart,
            login,
            register,
            logout,
            fetchCart
        }}>
            {children}
        </CartContext.Provider>
    );
};

export default CartContext;
