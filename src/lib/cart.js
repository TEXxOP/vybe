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
 *
 * GST IS INCLUSIVE, NOT ADDED. The listed price is what the customer pays; the
 * 18% used to be charged on top at this step, so a ₹2,500 jacket became ₹2,950
 * on the payment screen. The support pages already told customers GST was
 * "included in the figure we confirm with you", so the checkout was the one
 * place contradicting the policy — and it did it on the last screen.
 *
 * GST_RATE now only backs the tax *component* out of an already-inclusive
 * price, for display and for the invoice. The backend does the identical
 * calculation in includedTax() (order.service.js) — the two must agree, because
 * the server recomputes the total and refuses the order if it differs from the
 * figure the customer was shown.
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

/**
 * The GST already contained in an inclusive amount.
 *
 * `amount * rate / (1 + rate)` is the standard way to back tax out of a
 * tax-inclusive figure: ₹2,500 inclusive at 18% holds ₹381.36 of GST, not ₹450
 * (which would be 18% of the ex-tax price and would imply a total of ₹2,950).
 * The backend computes exactly this, so the itemised figure on the invoice and
 * the one on screen cannot drift apart.
 */
export function includedTax(inclusiveAmount, rate = GST_RATE) {
  const amount = Number.isFinite(inclusiveAmount) && inclusiveAmount > 0 ? inclusiveAmount : 0;
  return Math.round((amount * rate) / (1 + rate));
}

export function computeTotals(subtotal = 0) {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  const shipping = safeSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  /* Already inside safeSubtotal. Reported, never added. */
  const tax = includedTax(safeSubtotal);

  return {
    subtotal: safeSubtotal,
    shipping,
    tax,
    total: safeSubtotal + shipping,
    freeShipping: shipping === 0,
    /** How much more to spend to clear the threshold. 0 once cleared. */
    amountToFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - safeSubtotal),
  };
}
