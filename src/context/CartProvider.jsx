import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cartAPI, authAPI } from '../services/api';
import {
    CartContext,
    EMPTY_CART,
    GUEST_KEY,
    withTotals,
    readGuestCart,
} from './CartContext';

/**
 * CartProvider — the only export in this file, so edits to it hot-patch.
 *
 * The context object, the `useCart` hook and the pure helpers live in
 * ./CartContext.js. See the header there for why.
 */

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(EMPTY_CART);
    const [user, setUser] = useState(null);

    // FIXED: `loading` used to be a single flag covering cart fetches, but
    // AdminRoute was gating admin access on it — so on a hard refresh, `loading`
    // was false before the user had been restored from localStorage and admins
    // got flash-redirected to the homepage. Auth readiness and cart activity are
    // now separate concerns.
    const [cartLoading, setCartLoading] = useState(false);
    const [authReady, setAuthReady] = useState(false);

    const userRef = useRef(null);
    userRef.current = user;

    const fetchCart = useCallback(async () => {
        if (!authAPI.isLoggedIn()) return;
        try {
            setCartLoading(true);
            const data = await cartAPI.get();
            setCart(data.cart ? withTotals(data.cart.items || []) : EMPTY_CART);
        } catch (error) {
            console.error('Failed to fetch cart:', error);
        } finally {
            setCartLoading(false);
        }
    }, []);

    // Boot: restore the session, then load the right cart.
    // FIXED: fetchCart() used to be called from an effect with [] deps while
    // being redefined every render — a stale closure, and a lint error.
    useEffect(() => {
        const savedUser = authAPI.getUser();
        if (savedUser && authAPI.isLoggedIn()) {
            setUser(savedUser);
            fetchCart().finally(() => setAuthReady(true));
        } else {
            // A stale user with no token is a half-logged-out state; clear it.
            if (savedUser) authAPI.logout();
            setCart(readGuestCart());
            setAuthReady(true);
        }
    }, [fetchCart]);

    // Persist the guest cart. Skipped for signed-in users, whose cart is
    // authoritative on the server.
    useEffect(() => {
        if (user) return;
        if (!authReady) return; // don't overwrite storage before we've read it
        try {
            localStorage.setItem(GUEST_KEY, JSON.stringify(cart));
        } catch {
            // Quota or private-mode restriction. Cart still works in memory.
        }
    }, [cart, user, authReady]);

    const addToCart = useCallback(
        async (product, quantity = 1, size, color) => {
            if (!product?._id) return;

            if (authAPI.isLoggedIn()) {
                try {
                    setCartLoading(true);
                    const data = await cartAPI.add(product._id, quantity, size, color);
                    setCart(data.cart ? withTotals(data.cart.items || []) : EMPTY_CART);
                } catch (error) {
                    console.error('Failed to add to cart:', error);
                    throw error;
                } finally {
                    setCartLoading(false);
                }
                return;
            }

            setCart((prev) => {
                const existingIndex = prev.items.findIndex(
                    (item) =>
                        item.product._id === product._id &&
                        item.size === size &&
                        item.color === color
                );

                let newItems;
                if (existingIndex > -1) {
                    // FIXED: this used to be
                    //   newItems = [...prev.items];
                    //   newItems[existingIndex].quantity += quantity;
                    // The spread copies the array but not the objects inside it,
                    // so that incremented the quantity on the object still held
                    // by the previous state — a direct mutation. Under React 19's
                    // concurrent rendering that can be read mid-render and lose
                    // updates. Replace the item instead of editing it.
                    newItems = prev.items.map((item, i) =>
                        i === existingIndex
                            ? { ...item, quantity: item.quantity + quantity }
                            : item
                    );
                } else {
                    newItems = [
                        ...prev.items,
                        {
                            _id: `${product._id}-${size}-${color}`,
                            product: {
                                _id: product._id,
                                name: product.name,
                                price: product.price,
                                images: product.images,
                            },
                            quantity,
                            size,
                            color,
                            price: product.price,
                        },
                    ];
                }

                return withTotals(newItems);
            });
        },
        []
    );

    const updateQuantity = useCallback(async (itemId, quantity) => {
        if (authAPI.isLoggedIn()) {
            try {
                const data = await cartAPI.update(itemId, quantity);
                setCart(data.cart ? withTotals(data.cart.items || []) : EMPTY_CART);
            } catch (error) {
                console.error('Failed to update cart:', error);
                // FIXED: this used to swallow the error after logging it, so a
                // failed quantity change left the old number on screen with no
                // explanation — the user pressed "+", nothing happened, and the
                // only trace was in a console they will never open. addToCart
                // already rethrows; these three now honour the same contract so
                // callers can report the failure.
                throw error;
            }
            return;
        }

        setCart((prev) =>
            withTotals(
                quantity <= 0
                    ? prev.items.filter((item) => item._id !== itemId)
                    : prev.items.map((item) =>
                          item._id === itemId ? { ...item, quantity } : item
                      )
            )
        );
    }, []);

    const removeFromCart = useCallback(async (itemId) => {
        if (authAPI.isLoggedIn()) {
            try {
                const data = await cartAPI.remove(itemId);
                setCart(data.cart ? withTotals(data.cart.items || []) : EMPTY_CART);
            } catch (error) {
                console.error('Failed to remove from cart:', error);
                throw error; // see updateQuantity
            }
            return;
        }

        setCart((prev) =>
            withTotals(prev.items.filter((item) => item._id !== itemId))
        );
    }, []);

    const clearCart = useCallback(async () => {
        if (authAPI.isLoggedIn()) {
            try {
                await cartAPI.clear();
            } catch (error) {
                // Deliberately NOT rethrown, unlike updateQuantity and
                // removeFromCart. The only caller is checkout, after the order
                // has already been placed successfully. Failing to empty the
                // cart is untidy; blocking the confirmation screen over it
                // would make the customer think their order didn't go through.
                console.error('Failed to clear cart:', error);
            }
        }
        setCart(EMPTY_CART);
        try {
            localStorage.removeItem(GUEST_KEY);
        } catch {
            /* nothing to do */
        }
    }, []);

    /**
     * Carry a guest cart across the login boundary.
     *
     * Previously, signing in replaced the local cart with the (usually empty)
     * server cart, so anything you'd added as a guest silently vanished — a
     * reliable way to lose a sale. Best-effort: replay the guest items into the
     * server cart, then re-read it. Failures are swallowed because losing the
     * merge is bad but blocking the login is worse.
     */
    const mergeGuestCart = useCallback(async (guestItems) => {
        if (!guestItems?.length) return;
        for (const item of guestItems) {
            try {
                await cartAPI.add(
                    item.product._id,
                    item.quantity,
                    item.size,
                    item.color
                );
            } catch (error) {
                console.error('Could not merge a guest cart item:', error);
            }
        }
        try {
            localStorage.removeItem(GUEST_KEY);
        } catch {
            /* nothing to do */
        }
    }, []);

    const login = useCallback(
        async (credentials) => {
            const guestItems = userRef.current ? [] : readGuestCart().items;
            const data = await authAPI.login(credentials);
            setUser(data.user);
            await mergeGuestCart(guestItems);
            await fetchCart();
            return data;
        },
        [fetchCart, mergeGuestCart]
    );

    const register = useCallback(
        async (userData) => {
            const guestItems = userRef.current ? [] : readGuestCart().items;
            const data = await authAPI.register(userData);
            setUser(data.user);
            if (authAPI.isLoggedIn()) {
                await mergeGuestCart(guestItems);
                await fetchCart();
            }
            return data;
        },
        [fetchCart, mergeGuestCart]
    );

    const logout = useCallback(() => {
        authAPI.logout();
        setUser(null);
        setCart(EMPTY_CART);
        try {
            localStorage.removeItem(GUEST_KEY);
        } catch {
            /* nothing to do */
        }
    }, []);

    // Memoised so consumers don't re-render on every provider render.
    const value = useMemo(
        () => ({
            cart,
            user,
            // Same key as before, so nothing downstream breaks.
            loading: cartLoading,
            // New, more precise flags.
            cartLoading,
            authReady,
            isAdmin: user?.role === 'admin',
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart,
            login,
            register,
            logout,
            fetchCart,
        }),
        [
            cart,
            user,
            cartLoading,
            authReady,
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart,
            login,
            register,
            logout,
            fetchCart,
        ]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
