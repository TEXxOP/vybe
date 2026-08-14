import { Link } from 'react-router-dom';

import Ink from './primitives/Ink';
import Stamp from './primitives/Stamp';
import Button from './primitives/Button';
import { Icons } from './Icons';

import { money, shortDate } from '../lib/format';
import { ROUTES } from '../lib/routes';
import { statusMeta, STAGES, canCancel, paymentLabel } from '../lib/orders';
import styles from './OrderCard.module.css';

/**
 * ORDER CARD — one order, printed as a docket.
 *
 * Shared by /orders and /track-order because they show the same thing for
 * different reasons: the list shows all of yours, tracking shows the one you
 * asked about. Writing it twice would guarantee the two pages eventually
 * disagreed about what "processing" means.
 *
 * `onCancel` is optional. When it's absent the cancel control isn't rendered at
 * all — tracking is a read-only view — and when it's present it's still only
 * rendered if the server would actually accept the request. See canCancel in
 * lib/orders, which mirrors the controller's `['pending','confirmed']` guard.
 */

/** The product reference is an ObjectId when the order isn't populated and an
 *  object when it is. Both shapes occur depending on the endpoint, so resolve it
 *  rather than assuming — and if neither works, render the name as plain text
 *  instead of a link to /product/undefined. */
function productId(product) {
    if (!product) return null;
    return typeof product === 'string' ? product : product._id || null;
}

function Stepper({ status }) {
    const current = STAGES.findIndex((s) => s.key === status);

    return (
        <ol className={styles.stepper}>
            {STAGES.map((stage, i) => {
                const state =
                    i < current ? 'done' : i === current ? 'current' : 'todo';

                return (
                    <li key={stage.key} className={styles.step} data-state={state}>
                        <span className={styles.stepDot} aria-hidden="true" />
                        <span className={styles.stepLabel}>{stage.short}</span>
                        {/* The current stage is the only one a screen reader
                            needs announced as such; the rest are context. */}
                        {state === 'current' ? (
                            <span className="visuallyHidden"> — current stage</span>
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}

export default function OrderCard({ order, onCancel, busy = false }) {
    if (!order) return null;

    const meta = statusMeta(order.status);
    const items = Array.isArray(order.items) ? order.items : [];
    const cancelled = order.status === 'cancelled';

    return (
        <article className={styles.card} data-busy={busy ? 'true' : 'false'}>
            {/* ---- HEAD ---- */}
            <header className={styles.head}>
                <div className={styles.ref}>
                    <p className={styles.refLabel}>Order</p>
                    {/* user-select: all — this gets pasted into the tracking box. */}
                    <p className={styles.refNumber}>{order.orderNumber || '—'}</p>
                </div>

                <div className={styles.headMeta}>
                    <Stamp tone={meta.tone}>{meta.label}</Stamp>
                    <p className={styles.placed}>
                        Placed {shortDate(order.createdAt)}
                    </p>
                </div>
            </header>

            <p className={styles.blurb}>{meta.blurb}</p>

            {/* ---- PROGRESS ----
                A cancelled order gets the reason instead of a progress bar. Drawing
                a stepper for it would imply it's still moving. */}
            {cancelled ? (
                <p className={styles.cancelled}>
                    <Icons.X size={13} />
                    Cancelled {order.cancelledAt ? shortDate(order.cancelledAt) : ''}
                    {order.cancelReason ? ` — ${order.cancelReason}` : ''}
                </p>
            ) : (
                <Stepper status={order.status} />
            )}

            {order.trackingNumber ? (
                <p className={styles.tracking}>
                    <Icons.Truck size={13} />
                    Courier reference <strong>{order.trackingNumber}</strong>
                </p>
            ) : null}

            {/* ---- ITEMS ---- */}
            <ul className={styles.items}>
                {items.map((item, i) => {
                    const pid = productId(item.product);
                    const line = Number(item.price) * Number(item.quantity);

                    return (
                        <li
                            /* Order items have no stable id of their own, and the
                               same product can appear twice in different sizes, so
                               the key combines what actually distinguishes them. */
                            key={`${pid || item.name}-${item.size}-${item.color}-${i}`}
                            className={styles.item}
                        >
                            <div className={styles.thumb}>
                                {item.image ? (
                                    <Ink
                                        src={item.image}
                                        alt={item.name || 'Product'}
                                        ratio="1 / 1"
                                    />
                                ) : (
                                    /* No image on the record. Ink can report a
                                       broken URL, but an absent one never fires an
                                       error event, so handle it here. */
                                    <span className={styles.noThumb} aria-hidden="true">
                                        VY
                                    </span>
                                )}
                            </div>

                            <div className={styles.itemBody}>
                                <p className={styles.itemName}>
                                    {pid ? (
                                        <Link
                                            className={styles.itemLink}
                                            to={ROUTES.product(pid)}
                                        >
                                            {item.name || 'Product'}
                                        </Link>
                                    ) : (
                                        item.name || 'Product'
                                    )}
                                </p>

                                <p className={styles.itemMeta}>
                                    {[
                                        item.size ? `Size ${item.size}` : null,
                                        item.color || null,
                                        `Qty ${item.quantity}`,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>

                            <p className={styles.itemPrice}>
                                {money(Number.isFinite(line) ? line : 0)}
                            </p>
                        </li>
                    );
                })}
            </ul>

            {/* ---- MONEY ----
                The server's own figures, not a recomputation. If our arithmetic
                ever disagreed with the database, showing our version would hide
                the bug rather than reveal it. */}
            <dl className={styles.totals}>
                <div className={styles.totalRow}>
                    <dt>Items</dt>
                    <dd>{money(order.itemsPrice)}</dd>
                </div>

                <div className={styles.totalRow}>
                    <dt>Delivery</dt>
                    <dd>
                        {Number(order.shippingPrice) === 0
                            ? 'Free'
                            : money(order.shippingPrice)}
                    </dd>
                </div>

                <div className={styles.totalRow}>
                    <dt>GST</dt>
                    <dd>{money(order.taxPrice)}</dd>
                </div>

                <div className={styles.totalGrand}>
                    <dt>{order.status === 'delivered' ? 'Paid' : 'Due on delivery'}</dt>
                    <dd>{money(order.totalPrice)}</dd>
                </div>
            </dl>

            {/* ---- FOOT ---- */}
            <footer className={styles.foot}>
                <div className={styles.ship}>
                    <p className={styles.shipLabel}>Delivering to</p>
                    <address className={styles.address}>
                        {order.shippingAddress?.name}
                        <br />
                        {order.shippingAddress?.street}
                        <br />
                        {order.shippingAddress?.city}, {order.shippingAddress?.state}{' '}
                        {order.shippingAddress?.pincode}
                        <br />
                        {order.shippingAddress?.phone}
                    </address>
                    <p className={styles.payment}>
                        {paymentLabel(order.paymentMethod)}
                    </p>
                </div>

                {onCancel && canCancel(order) ? (
                    <div className={styles.actions}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCancel(order)}
                            loading={busy}
                        >
                            Cancel this order
                        </Button>
                        <p className={styles.actionsNote}>
                            Possible while it’s pending or confirmed. Once it’s in the
                            press we can’t stop it from here.
                        </p>
                    </div>
                ) : null}
            </footer>
        </article>
    );
}
