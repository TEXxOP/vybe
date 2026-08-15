import { createContext, useContext } from 'react';

/**
 * The cart context and its non-component parts.
 *
 * This used to live in CartContext.jsx alongside the provider, which meant one
 * file exported both a component and a hook. That trips
 * react-refresh/only-export-components: on every edit to this file Vite has to
 * full-reload instead of hot-patching, because it can't know whether the
 * non-component export changed shape.
 *
 * Rather than silence the rule, the split follows the same move used for
 * lib/drops.js — the logic that isn't a component moves to a plain module,
 * which makes it independently testable as a side effect. `withTotals` in
 * particular is worth testing directly: it is the single place cart totals are
 * computed, and it previously existed as five hand-rolled copies.
 *
 * The module specifier is unchanged for the eight files that import `useCart`,
 * since '../context/CartContext' resolves to this .js file.
 */

export const CartContext = createContext(null);

export const EMPTY_CART = { items: [], totalItems: 0, totalPrice: 0 };
export const GUEST_KEY = 'vybe_guest_cart';

/** Totals were recomputed by hand in five places. Now once, here. */
export function withTotals(items) {
    return {
        items,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        ),
    };
}

export function readGuestCart() {
    try {
        const raw = localStorage.getItem(GUEST_KEY);
        if (!raw) return EMPTY_CART;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.items)) return EMPTY_CART;
        // Recompute rather than trusting persisted totals.
        return withTotals(parsed.items);
    } catch {
        localStorage.removeItem(GUEST_KEY);
        return EMPTY_CART;
    }
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
