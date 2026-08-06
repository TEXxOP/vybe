/**
 * Order maths, in one place.
 *
 * This exact block was duplicated verbatim in Cart.jsx and Checkout.jsx:
 *
 *   shipping = subtotal >= 999 ? 0 : 99
 *   tax      = Math.round(subtotal * 0.18)
 *   total    = subtotal + shipping + tax
 *
 * Two copies of pricing logic is one copy too many — the day someone changes
 * the free-shipping threshold, the cart and the checkout disagree about what
 * the customer owes.
 */

export const FREE_SHIPPING_THRESHOLD = 999;
export const SHIPPING_FLAT = 99;
export const GST_RATE = 0.18;

/**
 * Ceiling on the quantity of any single line.
 *
 * Neither the product page nor the cart had a ceiling at all — you could order
 * forty of something with three in stock. Where real stock is known (the
 * product page knows the selected size's stock) the lower of the two wins; this
 * is the backstop for everywhere stock isn't known, such as a cart line whose
 * populated product carries no size breakdown.
 */
export const MAX_PER_LINE = 10;

export function computeTotals(subtotal = 0) {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  const shipping = safeSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const tax = Math.round(safeSubtotal * GST_RATE);

  return {
    subtotal: safeSubtotal,
    shipping,
    tax,
    total: safeSubtotal + shipping + tax,
    freeShipping: shipping === 0,
    /** How much more to spend to clear the threshold. 0 once cleared. */
    amountToFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - safeSubtotal),
  };
}
