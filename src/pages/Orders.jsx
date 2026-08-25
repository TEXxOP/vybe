import { useState } from 'react';
import { Link } from 'react-router-dom';

import Plate from '../components/primitives/Plate';
import Button from '../components/primitives/Button';
import Field from '../components/primitives/Field';
import Reveal from '../components/primitives/Reveal';
import Notice from '../components/Notice';
import OrderCard from '../components/OrderCard';
import { Icons } from '../components/Icons';

import { useCart } from '../context/CartContext';
import { ordersAPI } from '../services/api';
import { useMyOrders } from '../lib/useMyOrders';
import { ROUTES } from '../lib/routes';
import styles from './Orders.module.css';
import { COMPANY, emailHref } from '../lib/company';

/**
 * YOUR ORDERS.
 *
 * This route was linked from the header's account menu and from the old
 * confirmation page, and it was never mounted — so "View Orders" rendered an
 * empty <main>. Every order this shop has ever taken was invisible to the person
 * who placed it.
 *
 * Three decisions worth stating:
 *
 *  1. The signed-out case is a gate, not a redirect. Bouncing to /login loses the
 *     fact that you wanted your orders; this passes `state.from` so signing in
 *     brings you straight back, and it explains why you're being asked.
 *
 *  2. Cancelling asks for confirmation inline, with a reason. Not window.confirm
 *     — which can't be styled and reads as a browser error — and not a bare
 *     button either, because cancelling an order by mis-tap is unrecoverable. The
 *     reason goes to the server, which stores it in `cancelReason`: a field the
 *     API already had and nothing was ever filling.
 *
 *  3. The cancel control only appears when the server would accept it. canCancel
 *     in lib/orders mirrors the controller's `['pending','confirmed']` guard, so
 *     the button is absent rather than present-and-rejected.
 */

/* Sent as `cancelReason`. Presets rather than a free-text box because these are
   answerable in one tap and actually aggregate into something useful. */
const REASONS = [
    'Changed my mind',
    'Ordered the wrong size',
    'Ordered by mistake',
    'Taking too long to arrive',
    'Found it cheaper elsewhere',
    'Other',
];

const LABEL = 'Sheet · orders';

export default function Orders() {
    const { user, authReady } = useCart();

    if (!authReady) {
        return (
            <Notice label={LABEL} title="Your orders" live>
                <p>One moment…</p>
            </Notice>
        );
    }

    if (!user) {
        return (
            <Notice
                label={LABEL}
                title="Your orders"
                actions={
                    <>
                        <Button
                            to={ROUTES.login}
                            state={{ from: ROUTES.orders }}
                            variant="riso"
                            size="lg"
                        >
                            Sign in
                        </Button>
                        <Button
                            to={ROUTES.register}
                            state={{ from: ROUTES.orders }}
                            variant="outline"
                            size="lg"
                        >
                            Create an account
                        </Button>
                    </>
                }
                note="Looking for an order someone else placed — a gift, or a family member’s? They’ll need to look it up from their own account. We don’t show an address to whoever knows the reference."
            >
                <p>
                    Orders live on your account, so we need to know which account is
                    yours. Sign in and you’ll land back here.
                </p>
            </Notice>
        );
    }

    return <OrderList />;
}

function OrderList() {
    /* Fetch, abort, retry: lib/useMyOrders, shared with /track-order. `setOrders`
       comes back out because cancelling patches one record from the server's
       response instead of refetching the list to learn what we were just told. */
    const { orders, setOrders, status, error, retry } = useMyOrders();

    /* Which order is showing its confirmation panel, and which is mid-request.
       Two separate things: you can be confirming one order while another is
       still settling. */
    const [confirming, setConfirming] = useState(null);
    const [reason, setReason] = useState(REASONS[0]);
    const [busyId, setBusyId] = useState(null);
    const [cancelError, setCancelError] = useState('');

    const openConfirm = (order) => {
        setConfirming(order._id);
        setReason(REASONS[0]);
        setCancelError('');
    };

    const cancel = async (order) => {
        setBusyId(order._id);
        setCancelError('');

        try {
            const data = await ordersAPI.cancel(order._id, reason);

            /* Prefer the server's copy — it carries the real cancelledAt and the
               status the database actually holds. The local fallback exists only
               in case the endpoint stops returning it. */
            setOrders((prev) =>
                prev.map((o) =>
                    o._id === order._id
                        ? data.order || {
                              ...o,
                              status: 'cancelled',
                              cancelReason: reason,
                              cancelledAt: new Date().toISOString(),
                          }
                        : o
                )
            );
            setConfirming(null);
        } catch (err) {
            setCancelError(
                err?.message || 'That cancellation didn’t go through. Please try again.'
            );
        } finally {
            setBusyId(null);
        }
    };

    if (status === 'loading') {
        return (
            <Notice label={LABEL} title="Your orders" live>
                <p>Pulling your order history…</p>
            </Notice>
        );
    }

    if (status === 'error') {
        return (
            <Notice
                label={LABEL}
                title="Your orders"
                actions={
                    <Button variant="riso" size="lg" onClick={retry}>
                        Try again
                    </Button>
                }
            >
                <p role="alert">{error}</p>
            </Notice>
        );
    }

    if (orders.length === 0) {
        return (
            <Notice
                label={LABEL}
                title="No orders yet"
                actions={
                    <Button to={ROUTES.shop} variant="riso" size="lg">
                        See what’s in print
                    </Button>
                }
            >
                <p>
                    Nothing here so far. When you place an order it’ll appear on this
                    page, with its status and a cancel button while cancelling is
                    still possible.
                </p>
            </Notice>
        );
    }

    return (
        <Plate tone="paper" label={LABEL}>
            <div className={styles.page}>
                <header className={styles.head}>
                    <p className={styles.eyebrow}>Account</p>
                    <h1 className={styles.title}>Your orders</h1>
                    <p className={styles.count}>
                        {orders.length} {orders.length === 1 ? 'order' : 'orders'},
                        newest first
                    </p>
                </header>

                <ul className={styles.list}>
                    {orders.map((order, i) => (
                        <Reveal
                            as="li"
                            key={order._id}
                            className={styles.listItem}
                            /* Capped so the twentieth card doesn't wait two
                               seconds to appear. */
                            delay={Math.min(i, 4) * 70}
                        >
                            <OrderCard
                                order={order}
                                onCancel={openConfirm}
                                busy={busyId === order._id}
                            />

                            {confirming === order._id ? (
                                <div className={styles.confirm}>
                                    <p className={styles.confirmTitle}>
                                        Cancel {order.orderNumber}?
                                    </p>
                                    <p className={styles.confirmText}>
                                        This can’t be undone. Nothing has been
                                        collected, so there’s nothing to refund — but
                                        if the run sells out you won’t be able to
                                        reorder it.
                                    </p>

                                    <Field
                                        as="select"
                                        label="Reason"
                                        name={`reason-${order._id}`}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        options={REASONS}
                                        hint="Helps us work out what to fix."
                                    />

                                    {cancelError ? (
                                        <p className={styles.failure} role="alert">
                                            {cancelError}
                                        </p>
                                    ) : null}

                                    <div className={styles.confirmActions}>
                                        <Button
                                            variant="danger"
                                            size="md"
                                            onClick={() => cancel(order)}
                                            loading={busyId === order._id}
                                        >
                                            Yes, cancel it
                                        </Button>
                                        <Button
                                            variant="quiet"
                                            size="md"
                                            onClick={() => setConfirming(null)}
                                            disabled={busyId === order._id}
                                        >
                                            Keep the order
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </Reveal>
                    ))}
                </ul>

                <footer className={styles.foot}>
                    <p className={styles.footText}>
                        Something not right with one of these? Mail{' '}
                        <a className={styles.footLink} href={emailHref}>
                            {COMPANY.email}
                        </a>{' '}
                        with the order number, or read the{' '}
                        <Link className={styles.footLink} to={ROUTES.returns}>
                            returns policy
                        </Link>
                        .
                    </p>

                    <Link className={styles.back} to={ROUTES.shop}>
                        <Icons.ArrowLeft size={13} /> Back to the shop
                    </Link>
                </footer>
            </div>
        </Plate>
    );
}
