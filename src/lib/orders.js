/**
 * Order vocabulary — one place where an order's status becomes English.
 *
 * Both /orders and /track-order display statuses, OrderSuccess names a payment
 * method, and the admin order table will need the same words again. Four copies
 * of the same lookup drift within a week, and the visible symptom is a shop that
 * calls the same state "In the press" on one page and "Processing" on another.
 *
 * The keys are the enum from backend/src/models/Order.model.js, exactly:
 * pending, confirmed, processing, shipped, delivered, cancelled.
 */

/** Tones map onto Stamp's variants — ink, pink, blue, ok, danger, muted. */
export const ORDER_STATUS = {
    pending: {
        label: 'Pending',
        tone: 'muted',
        blurb: 'We have it. It’s queued for the next print batch.',
    },
    confirmed: {
        label: 'Confirmed',
        tone: 'blue',
        blurb: 'Confirmed and in the batch. You can still cancel it.',
    },
    processing: {
        label: 'In the press',
        tone: 'blue',
        blurb: 'Being printed and packed. Too late to cancel from here.',
    },
    shipped: {
        label: 'Shipped',
        tone: 'pink',
        blurb: 'Handed to the courier and moving.',
    },
    delivered: {
        label: 'Delivered',
        tone: 'ok',
        blurb: 'Delivered. The seven-day return window starts from this date.',
    },
    cancelled: {
        label: 'Cancelled',
        tone: 'danger',
        blurb: 'Cancelled. Nothing was collected, so there’s nothing to refund.',
    },
};

const UNKNOWN = { label: 'Unknown', tone: 'muted', blurb: '' };

/** Never returns undefined. A status the front end hasn't heard of — because
 *  someone added one to the enum — degrades to "Unknown" rather than crashing a
 *  page on `.label` of undefined. */
export function statusMeta(status) {
    return ORDER_STATUS[status] || UNKNOWN;
}

/** The forward path an order takes. `cancelled` is deliberately absent: it isn't
 *  a stage, it's an exit, and drawing it as the sixth step of a progress bar
 *  would imply every order is heading there. */
export const STAGES = [
    { key: 'pending', short: 'Placed' },
    { key: 'confirmed', short: 'Confirmed' },
    { key: 'processing', short: 'Printing' },
    { key: 'shipped', short: 'Shipped' },
    { key: 'delivered', short: 'Delivered' },
];

/**
 * Mirrors the server's rule in order.controller.js exactly:
 *
 *     if (!['pending', 'confirmed'].includes(order.status))
 *         return res.status(400) …
 *
 * Kept as a set so the UI hides the cancel button in precisely the cases the
 * server would reject. Offering a button that returns 400 is worse than not
 * offering it — it reads as a broken site rather than a closed window.
 */
const CANCELLABLE = new Set(['pending', 'confirmed']);

export function canCancel(order) {
    return CANCELLABLE.has(order?.status);
}

/** Payment methods, from the same enum. Every label says "on delivery" because
 *  no gateway is connected — see the disclosure on the checkout page. */
export const PAYMENT_LABELS = {
    cod: 'Cash on delivery',
    upi: 'UPI, on delivery',
    card: 'Card, on delivery',
    netbanking: 'Net banking, on delivery',
};

export function paymentLabel(method) {
    return PAYMENT_LABELS[method] || 'On delivery';
}
