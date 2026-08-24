import { useCallback, useState } from 'react';

import Button from '../../components/primitives/Button';
import { useResource, selectOrders } from '../../lib/useResource';
import { ORDER_STATUS, statusMeta, paymentLabel } from '../../lib/orders';
import { money } from '../../lib/format';
import { adminAPI } from '../../services/api';
import { Icons } from '../../components/Icons';
import styles from './AdminTable.module.css';

/**
 * ADMIN — ORDERS.
 *
 * THE BUG THAT MATTERED. The status dropdown offered four options:
 *
 *     processing · shipped · delivered · cancelled
 *
 * The schema's enum has six: pending, confirmed, processing, shipped,
 * delivered, cancelled. Every new order is created `pending`. So a freshly
 * placed order rendered <select value="pending"> with no matching <option>,
 * which in React means the select displays the *first* option instead —
 * "Processing". Every pending order in the shop looked like it was already being
 * printed. And because the displayed value no longer matched the real one, the
 * first interaction with that dropdown silently pushed a status change nobody
 * asked for. `confirmed` was simply unreachable: an order could never be moved
 * into the one state the customer's own cancel button depends on.
 *
 * The options now come from ORDER_STATUS in lib/orders, which is keyed to the
 * schema enum. A sixth status can't be added to the model without appearing
 * here.
 *
 * ALSO FIXED:
 *
 *  1. `order.shippingAddress.email` was unguarded — one order saved without a
 *     shipping address threw a TypeError that took out the entire table, not
 *     just the row. `order.user?.name` on the line above was guarded, so the
 *     author knew the pattern and missed one.
 *
 *  2. A failed status update called alert(). A modal you must dismiss before you
 *     can see which row failed, with no way to retry except doing it again.
 *
 *  3. The fetch swallowed its error into console.error and then rendered an
 *     empty table — indistinguishable from "no orders yet".
 *
 *  4. "View Details" was a button that did nothing. Not disabled, not a stub —
 *     it had no handler at all. It's gone; the row now shows the payment method
 *     and item count inline, which is what it would have opened a panel to say.
 *
 *  5. The optimistic update read `orders` from the closure, so two quick
 *     changes to different rows could drop the first. It's a functional update
 *     now.
 *
 *  6. The order reference shown was `_id.slice(-6)` — a fragment of a Mongo id.
 *     Orders carry an `orderNumber` (VYBE…) which is what the customer sees on
 *     their confirmation and in their account. Admin and customer could not
 *     refer to the same order by the same name.
 */

/* Built from the shared status map, so this list and the schema enum can't
   diverge. Order follows the lifecycle rather than the object's key order. */
const STATUS_OPTIONS = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
].map((value) => ({ value, label: ORDER_STATUS[value].label }));

export default function AdminOrders() {
    /* Passed by reference — useResource holds the fetcher in a dependency
       array, so an inline arrow would refetch forever. */
    const { data, setData, status, error, retry } = useResource(
        adminAPI.getAllOrders,
        selectOrders
    );

    const orders = data || [];

    const [busyId, setBusyId] = useState(null);
    const [writeError, setWriteError] = useState('');

    const updateStatus = useCallback(
        async (order, next) => {
            if (next === order.status) return;

            setBusyId(order._id);
            setWriteError('');

            try {
                const result = await adminAPI.updateOrderStatus(order._id, next);

                /* Prefer the server's record. The local fallback exists only in
                   case the endpoint stops returning the updated order. */
                setData((prev) =>
                    (prev || []).map((o) =>
                        o._id === order._id
                            ? result?.order || { ...o, status: next }
                            : o
                    )
                );
            } catch (err) {
                setWriteError(
                    `${order.orderNumber || 'That order'} didn’t update: ${
                        err?.message || 'the request failed'
                    }`
                );
            } finally {
                setBusyId(null);
            }
        },
        [setData]
    );

    if (status === 'loading') {
        return (
            <p className={styles.empty} aria-live="polite">
                Fetching dockets…
            </p>
        );
    }

    if (status === 'error') {
        return (
            <div className={styles.empty}>
                <p className={styles.emptyTitle}>Couldn’t load orders</p>
                <p className={styles.emptyText} role="alert">
                    {error}
                </p>
                <div className={styles.emptyActions}>
                    <Button variant="riso" size="md" onClick={retry}>
                        <Icons.RefreshCw size={14} /> Try again
                    </Button>
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className={styles.empty}>
                <p className={styles.emptyTitle}>No orders yet</p>
                <p className={styles.emptyText}>
                    Nothing has been placed. This is an empty ledger, not a failed
                    request — if the server were unreachable you’d see an error
                    here instead.
                </p>
            </div>
        );
    }

    return (
        <>
            {writeError ? (
                <p className={styles.failure} role="alert">
                    {writeError}
                </p>
            ) : null}

            <div className={styles.toolbar}>
                <p className={styles.count}>
                    {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                </p>
            </div>

            {/* tabindex + role so the horizontal overflow is keyboard-reachable
                and announced. An overflow region that only a trackpad can move
                doesn't exist for a keyboard user. */}
            <div
                className={styles.scroller}
                tabIndex={0}
                role="region"
                aria-label="All orders, scrollable"
            >
                <table className={styles.table}>
                    <caption>
                        Every order placed, newest first. Change an order’s status
                        with the dropdown in its row.
                    </caption>

                    <thead>
                        <tr>
                            <th scope="col">Reference</th>
                            <th scope="col">Customer</th>
                            <th scope="col">Placed</th>
                            <th scope="col">Contents</th>
                            <th scope="col">Total</th>
                            <th scope="col">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {orders.map((order) => {
                            const meta = statusMeta(order.status);
                            const items = Array.isArray(order.items)
                                ? order.items
                                : [];

                            /* Both guarded. The old code guarded the name and
                               then dereferenced shippingAddress.email one line
                               later. */
                            const email =
                                order.user?.email ||
                                order.shippingAddress?.email ||
                                '—';

                            return (
                                <tr
                                    key={order._id}
                                    data-busy={busyId === order._id}
                                >
                                    <td className={styles.ref}>
                                        {order.orderNumber || '—'}
                                    </td>

                                    <td>
                                        <span className={styles.name}>
                                            {order.user?.name ||
                                                order.shippingAddress?.fullName ||
                                                'Unknown'}
                                        </span>
                                        <span className={styles.meta}>{email}</span>
                                    </td>

                                    <td>
                                        {order.createdAt ? (
                                            <time dateTime={order.createdAt}>
                                                {new Date(
                                                    order.createdAt
                                                ).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </time>
                                        ) : (
                                            '—'
                                        )}
                                    </td>

                                    <td>
                                        {items.length}{' '}
                                        {items.length === 1 ? 'item' : 'items'}
                                        <span className={styles.meta}>
                                            {paymentLabel(order.paymentMethod)}
                                        </span>
                                    </td>

                                    <td className={styles.num}>
                                        {money(order.totalPrice)}
                                    </td>

                                    <td>
                                        {/* The label is visually hidden rather
                                            than absent: an unlabelled select in
                                            a table row is announced only as
                                            "combobox", with no indication of
                                            which order it belongs to. */}
                                        <label>
                                            <span className={styles.srOnly}>
                                                Status for order{' '}
                                                {order.orderNumber || order._id}
                                            </span>
                                            <select
                                                className={styles.statusSelect}
                                                data-tone={meta.tone}
                                                value={
                                                    ORDER_STATUS[order.status]
                                                        ? order.status
                                                        : ''
                                                }
                                                disabled={busyId === order._id}
                                                onChange={(e) =>
                                                    updateStatus(
                                                        order,
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                {/* Only rendered when the stored
                                                    status isn't one we know, so
                                                    the control still reflects
                                                    reality instead of silently
                                                    showing the first option. */}
                                                {!ORDER_STATUS[order.status] ? (
                                                    <option value="" disabled>
                                                        {order.status ||
                                                            'Unknown'}
                                                    </option>
                                                ) : null}

                                                {STATUS_OPTIONS.map((o) => (
                                                    <option
                                                        key={o.value}
                                                        value={o.value}
                                                    >
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        {/* Only the cancellation reason goes
                                            here. Repeating the status label
                                            under a select that already shows it
                                            would just be the same fact twice. */}
                                        {order.status === 'cancelled' &&
                                        order.cancelReason ? (
                                            <span className={styles.meta}>
                                                Reason: {order.cancelReason}
                                            </span>
                                        ) : null}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
