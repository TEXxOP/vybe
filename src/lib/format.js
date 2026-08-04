/** Formatting helpers. One currency formatter, built once, not per render. */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹4,999 — the default everywhere prices are shown. */
export function money(value) {
  const n = Number(value);
  return inr.format(Number.isFinite(n) ? n : 0);
}

/** ₹4,999.00 — invoices and order confirmations only. */
export function moneyPrecise(value) {
  const n = Number(value);
  return inrPrecise.format(Number.isFinite(n) ? n : 0);
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function shortDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

/** Order ids are long Mongo ObjectIds; nobody reads those aloud. */
export function orderRef(id) {
  if (!id) return '——————';
  return `#${String(id).slice(-6).toUpperCase()}`;
}

/** Initials for an avatar. Replaces the stock photo of a stranger that the
 *  previous Header used as every single user's profile picture. */
export function initials(name = '', email = '') {
  const source = (name || email || '').trim();
  if (!source) return 'V';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Discount badge percentage, or 0 when there's nothing to shout about. */
export function discountPercent(price, comparePrice) {
  const p = Number(price);
  const c = Number(comparePrice);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= p) return 0;
  return Math.round(((c - p) / c) * 100);
}
