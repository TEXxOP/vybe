import { Link } from 'react-router-dom';

import Button from '../../components/primitives/Button';
import { Icons } from '../../components/Icons';
import { useResource } from '../../lib/useResource';
import { statusMeta } from '../../lib/orders';
import { money } from '../../lib/format';
import { ROUTES } from '../../lib/routes';
import { adminAPI } from '../../services/api';

import styles from './AdminDashboard.module.css';
import table from './AdminTable.module.css';

/**
 * ADMIN — DASHBOARD.
 *
 * THE WORST BUG ON THIS PAGE WAS INVISIBLE. The fetch was wrapped in
 * try/catch/finally where the catch did nothing but console.error, and the
 * initial state was a set of zeroes. So when the backend was unreachable the
 * page rendered:
 *
 *     Total Revenue    ₹0
 *     Total Orders     0
 *     Active Products  0
 *
 * — three confident figures, no error, no retry. On a reporting screen that is
 * the most dangerous possible failure, because zero is a plausible answer. An
 * owner could look at that and conclude they'd had no sales. The page now has an
 * explicit error state with a retry, and it never shows a number it didn't
 * receive.
 *
 * ALSO FIXED:
 *
 *  1. `data.orders.slice(0, 5)` — unguarded. A response without an `orders`
 *     array threw a TypeError inside the try, which the catch then swallowed
 *     into console.error, so a malformed response looked identical to a
 *     successful one with no sales.
 *
 *  2. No AbortController. Clicking straight through to Products left the
 *     request in flight to resolve into an unmounted component.
 *
 *  3. `getStatusColor()` mapped status → 'green' | 'blue' | 'orange' | 'red' |
 *     'gray', a fourth vocabulary for order status alongside the two in the
 *     orders page and the one the customer sees. It's statusMeta from
 *     lib/orders now — one source, so a status can't be pink here and orange
 *     there.
 *
 *  4. A local `formatCurrency` with maximumFractionDigits: 0, which was the
 *     third copy of that Intl formatter in the admin folder and disagreed with
 *     the storefront's. It's `money()` from lib/format.
 *
 *  5. Order references were `_id.slice(-6)` while the customer sees
 *     `orderNumber`. The two halves of the shop couldn't name the same order.
 *
 *  6. The stat cards were <div>s. Three labelled figures are a list, and they're
 *     a <ul> now, so the count is announced.
 */

export default function AdminDashboard() {
    /* Passed by reference. An inline arrow would be a new identity on every
       render and useResource holds the fetcher in its dependency array. */
    const { data, status, error, retry } = useResource(adminAPI.getStats);

    if (status === 'loading') {
        return (
            <p className={styles.waiting} aria-live="polite">
                Counting the run…
            </p>
        );
    }

    if (status === 'error') {
        return (
            <div className={styles.failure}>
                <p className={styles.failureTitle}>Couldn’t load the figures</p>
                <p className={styles.failureText} role="alert">
                    {error} Nothing is shown rather than zeroes — a zero here
                    would look like a quiet day instead of a failed request.
                </p>
                <Button variant="riso" size="md" onClick={retry}>
                    <Icons.RefreshCw size={14} /> Try again
                </Button>
            </div>
        );
    }

    /* Guarded, unlike the original's `data.orders.slice(0, 5)`. */
    const allOrders = Array.isArray(data?.orders) ? data.orders : [];
    const recent = allOrders.slice(0, 5);

    const pending = allOrders.filter((o) => o.status === 'pending').length;

    return (
        <>
            <ul className={styles.stats}>
                <li className={styles.stat}>
                    <span className={styles.statIcon}>
                        <Icons.TrendingUp size={20} />
                    </span>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Revenue booked</span>
                        <p className={styles.statValue}>
                            {money(data?.totalRevenue)}
                        </p>
                        <p className={styles.statNote}>
                            Every order placed, including any later cancelled —
                            it isn’t money collected. All orders are cash on
                            delivery.
                        </p>
                    </div>
                </li>

                <li className={styles.stat}>
                    <span className={styles.statIcon}>
                        <Icons.Package size={20} />
                    </span>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Orders</span>
                        <p className={styles.statValue}>
                            {data?.totalOrders ?? 0}
                        </p>
                        <p className={styles.statNote}>
                            {pending > 0
                                ? `${pending} still pending — they need confirming before they can be printed.`
                                : 'Nothing pending. Every order has been moved on.'}
                        </p>
                    </div>
                </li>

                <li className={styles.stat}>
                    <span className={styles.statIcon}>
                        <Icons.ShoppingBag size={20} />
                    </span>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Products</span>
                        <p className={styles.statValue}>
                            {data?.totalProducts ?? 0}
                        </p>
                        <p className={styles.statNote}>
                            Records in the catalogue, whether or not they’re
                            currently in stock.
                        </p>
                    </div>
                </li>
            </ul>

            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>Latest dockets</h2>
                    <Link className={styles.sectionLink} to={ROUTES.adminOrders}>
                        All orders →
                    </Link>
                </div>

                {recent.length === 0 ? (
                    <div className={table.empty}>
                        <p className={table.emptyTitle}>No orders yet</p>
                        <p className={table.emptyText}>
                            This is an empty ledger, not a failed request — a
                            failure would have shown an error above instead of
                            these figures.
                        </p>
                    </div>
                ) : (
                    <div
                        className={table.scroller}
                        tabIndex={0}
                        role="region"
                        aria-label="Five most recent orders, scrollable"
                    >
                        <table className={table.table}>
                            <caption>
                                The five most recent orders. The orders page has
                                the full list and the controls to change a status.
                            </caption>

                            <thead>
                                <tr>
                                    <th scope="col">Reference</th>
                                    <th scope="col">Customer</th>
                                    <th scope="col">Placed</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                {recent.map((order) => {
                                    const meta = statusMeta(order.status);

                                    return (
                                        <tr key={order._id}>
                                            <td className={table.ref}>
                                                {order.orderNumber || '—'}
                                            </td>
                                            <td>
                                                <span className={table.name}>
                                                    {order.user?.name ||
                                                        order.shippingAddress
                                                            ?.fullName ||
                                                        'Unknown'}
                                                </span>
                                            </td>
                                            <td>
                                                {order.createdAt ? (
                                                    <time
                                                        dateTime={order.createdAt}
                                                    >
                                                        {new Date(
                                                            order.createdAt
                                                        ).toLocaleDateString(
                                                            'en-IN',
                                                            {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            }
                                                        )}
                                                    </time>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={table.badge}
                                                    data-tone={meta.tone}
                                                >
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className={table.num}>
                                                {money(order.totalPrice)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
}
