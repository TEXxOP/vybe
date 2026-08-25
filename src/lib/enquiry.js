import { COMPANY } from './company';
import { ROUTES } from './routes';
import { money } from './format';

/**
 * ENQUIRE, DON'T ORDER.
 *
 * The shop shows a catalogue and takes enquiries over WhatsApp. It does not take
 * payment. This module is the whole of that decision: the flag that switches
 * between the two models, and the builders that turn a product or a bag into a
 * prefilled WhatsApp message.
 *
 * WHY A FLAG AND NOT DELETED CODE. The cart, the checkout form, the order
 * history and the whole backend order pipeline all still work. They are not
 * commented out and they are not removed — commented-out code is invisible to
 * the linter and to the two checkers in scripts/, so it rots silently and is
 * worth less than no code at all. Instead every commerce affordance reads
 * COMMERCE_ENABLED, so:
 *
 *   - turning ordering back on is editing `false` to `true`, once;
 *   - until then, the paths that would have taken money say plainly that they
 *     don't, and offer WhatsApp instead;
 *   - the code stays under lint, so it cannot quietly stop compiling.
 *
 * WHAT THE MESSAGE DELIBERATELY OMITS. The cart enquiry quotes the subtotal of
 * the items and nothing else — no delivery charge, no GST, no grand total. Those
 * numbers exist in lib/cart.js and could be included, but a total is a quote, and
 * quoting a figure the enquiry hasn't agreed to yet is exactly the kind of
 * promise-the-site-can't-keep this rebuild has been removing. Delivery and tax
 * are settled in the conversation.
 */

/** The one line to change to put real ordering back. */
export const COMMERCE_ENABLED = false;

/**
 * Budget for the *encoded* message, which is the only length that matters — the
 * link is what travels, not the text. Measuring the plain string would badly
 * undercount: every ₹ becomes %E2%82%B9 and every — becomes %E2%80%94, so a
 * rupee-and-em-dash-heavy bag roughly doubles on the way into the URL. 1,800
 * keeps the whole href comfortably under 2,000 characters including the host.
 */
const MAX_ENCODED_CHARS = 1800;

/**
 * Absolute URL for a product, so the shop can click straight through from the
 * chat. Guarded because `window` is absent under Node — the checkers in
 * scripts/ import this module's siblings, and a bare `window` reference would
 * make this file unloadable outside a browser.
 */
function productUrl(id) {
  if (!id || typeof window === 'undefined') return '';
  return `${window.location.origin}${ROUTES.product(id)}`;
}

/** "Size M · Black", or "" when a product has neither axis. */
/* Null rather than '' when there is no variant: an empty string is a real line
   in the message array and left a blank gap between the product name and its
   price for every one-size item. */
function variantLabel({ size, color } = {}) {
  return [size && `Size ${size}`, color].filter(Boolean).join(' · ') || null;
}

/** Trim to a length WhatsApp will carry, dropping whole lines rather than
 *  cutting one in half. Measured after encoding, for the reason above. */
function clamp(message) {
  if (encodeURIComponent(message).length <= MAX_ENCODED_CHARS) return message;

  const suffix = '\n…and a few more items.';
  const lines = message.split('\n');
  while (
    lines.length > 1 &&
    encodeURIComponent(lines.join('\n') + suffix).length > MAX_ENCODED_CHARS
  ) {
    lines.pop();
  }
  return lines.join('\n') + suffix;
}

/**
 * A wa.me link carrying a prefilled message.
 *
 * wa.me is WhatsApp's own click-to-chat host and resolves to the app on mobile
 * and to WhatsApp Web on desktop, which is why it's used rather than the
 * `whatsapp://` scheme — that one fails silently on a desktop browser with no
 * app installed, and a silent failure on the only call-to-action the site has
 * would be the worst bug available here.
 */
export function whatsappHref(message = '') {
  const text = message ? `?text=${encodeURIComponent(clamp(message))}` : '';
  return `https://wa.me/${COMPANY.whatsapp}${text}`;
}

/** Enquiry about one item, from a product page or a card. */
export function productEnquiryHref(product, { size, color, qty = 1 } = {}) {
  const name = product?.name || 'an item';
  const variant = variantLabel({ size, color });
  const url = productUrl(product?._id);

  const message = [
    `Hi ${COMPANY.brand} — I'd like to enquire about this item.`,
    '',
    name,
    variant,
    qty > 1 ? `Quantity: ${qty}` : null,
    Number(product?.price) ? `Listed at ${money(product.price)}` : null,
    url && '',
    url,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return whatsappHref(message);
}

/**
 * Enquiry about a whole bag. `items` is the cart's own line shape:
 * `{ product: { name }, price, quantity, size, color }`.
 */
export function cartEnquiryHref(items = []) {
  const lines = items.filter(Boolean);

  /* An enquiry about nothing reads as a bug to whoever receives it. The cart
     page hides this action when the bag is empty, so this is a guard rather
     than a path anyone should reach — but it degrades to a plain hello instead
     of "these items:" followed by a blank line and a subtotal of ₹0. */
  if (lines.length === 0) return generalEnquiryHref();

  const subtotal = lines.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

  const body = lines.map((item, i) => {
    const parts = [
      item.product?.name || item.name || 'Item',
      variantLabel(item),
      `Qty ${Number(item.quantity) || 1}`,
      Number(item.price) ? `${money(item.price)} each` : null,
    ].filter(Boolean);
    return `${i + 1}. ${parts.join(' — ')}`;
  });

  const message = [
    `Hi ${COMPANY.brand} — I'd like to enquire about these items.`,
    '',
    ...body,
    '',
    /* Subtotal only. See the note at the top of this file. */
    `Items subtotal: ${money(subtotal)}`,
  ].join('\n');

  return whatsappHref(message);
}

/** Enquiry with no product attached — the footer, the contact block, a 404. */
export function generalEnquiryHref() {
  return whatsappHref(`Hi ${COMPANY.brand} — I have a question.`);
}
