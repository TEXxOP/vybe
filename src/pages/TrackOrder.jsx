import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Plate from '../components/primitives/Plate';
import Button from '../components/primitives/Button';
import Field from '../components/primitives/Field';
import Reveal from '../components/primitives/Reveal';
import Notice from '../components/Notice';
import OrderCard from '../components/OrderCard';
import { Icons } from '../components/Icons';

import { useCart } from '../context/CartContext';
import { useMyOrders } from '../lib/useMyOrders';
import { ROUTES } from '../lib/routes';
import styles from './TrackOrder.module.css';

/**
 * TRACK ORDER.
 *
 * WHY THIS PAGE REQUIRES SIGNING IN — and it's a real constraint, not a
 * preference. There is no endpoint on this backend that looks an order up by its
 * `orderNumber`. `getOrderById` does `Order.findById(req.params.id)`, which takes
 * a Mongo ObjectId, and every route in order.routes.js sits behind `protect`.
 * There is no guest lookup to call.
 *
 * Three ways to respond to that:
 *
 *   (a) Build a public `GET /orders/track/:orderNumber`. That's a new endpoint
 *       exposing a name, phone number and full street address to anyone holding a
 *       reference — and the reference is `VYBE` plus a timestamp plus a padded
 *       counter, which is guessable. I'm not shipping that.
 *   (b) Fake it. Accept any input and show a plausible status. That's the
 *       fabricated-order-number bug from the old checkout, wearing a hat.
 *   (c) Ask people to sign in, fetch the orders that are provably theirs, and
 *       match the reference against those in the browser.
 *
 * This is (c). It's the only one of the three that is both honest and safe, and
 * the page says so out loud rather than making the requirement look arbitrary.
 *
 * The search runs against already-fetched data, so it's instant and needs no
 * debounce. `?ref=` in the URL prefills the box, which makes the reference on a
 * confirmation email — if we ever send one — a working link.
 */

const LABEL = 'Sheet · tracking';

export default function TrackOrder() {
    const { user, authReady } = useCart();

    if (!authReady) {
        return (
            <Notice label={LABEL} title="Track order" live>
                <p>One moment…</p>
            </Notice>
        );
    }

    if (!user) {
        return (
            <Notice
                label={LABEL}
                title="Track order"
                actions={
                    <>
                        <Button
                            to={ROUTES.login}
                            state={{ from: ROUTES.trackOrder }}
                            variant="riso"
                            size="lg"
                        >
                            Sign in
                        </Button>
                        <Button
                            to={ROUTES.register}
                            state={{ from: ROUTES.trackOrder }}
                            variant="outline"
                            size="lg"
                        >
                            Create an account
                        </Button>
                    </>
                }
                note="An order number on its own isn’t proof an order is yours — ours are sequential enough to guess at. Since the record holds a phone number and a street address, we only show it to the account that placed it."
            >
                <p>
                    Tracking needs you signed in to the account that placed the
                    order.
                </p>
            </Notice>
        );
    }

    return <Tracker />;
}

function Tracker() {
    const [params, setParams] = useSearchParams();

    /* Fetch, abort and retry live in lib/useMyOrders — /orders needs the same
       four things and had the same code until the second copy made that plain. */
    const { orders, status, error, retry } = useMyOrders();

    /* The box is seeded from ?ref= so a link can carry the reference. */
    const [query, setQuery] = useState(params.get('ref') || '');
    const [submitted, setSubmitted] = useState(params.get('ref') || '');

    /* Matching is deliberately forgiving about case and stray whitespace —
       people paste with a trailing space, and "vybe…" typed in lower case is
       still the right reference. It is NOT forgiving about partial matches: a
       reference either identifies one order or it doesn't. */
    const match = useMemo(() => {
        const needle = submitted.trim().toUpperCase();
        if (!needle) return null;
        return (
            orders.find(
                (o) => String(o.orderNumber || '').toUpperCase() === needle
            ) || null
        );
    }, [orders, submitted]);

    const submit = (e) => {
        e.preventDefault();
        const next = query.trim();
        setSubmitted(next);

        /* Keep the URL in step, so the result survives a refresh and can be
           shared with support. `replace` — twenty searches shouldn't mean twenty
           presses of the back button to leave. */
        if (next) setParams({ ref: next }, { replace: true });
        else setParams({}, { replace: true });
    };

    if (status === 'loading') {
        return (
            <Notice label={LABEL} title="Track order" live>
                <p>Fetching your orders…</p>
            </Notice>
        );
    }

    if (status === 'error') {
        return (
            <Notice
                label={LABEL}
                title="Track order"
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
                title="Nothing to track"
                actions={
                    <Button to={ROUTES.shop} variant="riso" size="lg">
                        See what’s in print
                    </Button>
                }
            >
                <p>
                    There are no orders on this account yet, so there’s nothing for a
                    reference to match.
                </p>
            </Notice>
        );
    }

    return (
        <Plate tone="paper" label={LABEL}>
            <div className={styles.page}>
                <header className={styles.head}>
                    <p className={styles.eyebrow}>Where is it</p>
                    <h1 className={styles.title}>Track order</h1>
                    <p className={styles.lede}>
                        Enter the reference beginning <strong>VYBE</strong> from your
                        confirmation page. Or skip the typing and open{' '}
                        <Link className={styles.link} to={ROUTES.orders}>
                            your orders
                        </Link>
                        , which shows all {orders.length} of them.
                    </p>
                </header>

                <form className={styles.form} onSubmit={submit} noValidate>
                    <Field
                        label="Order number"
                        name="ref"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="VYBE…"
                        autoComplete="off"
                        spellCheck="false"
                        /* Mono, so a long digit string can be checked character
                           by character against a printed one. */
                        className={styles.refInput}
                    />

                    <Button type="submit" variant="riso" size="lg">
                        <Icons.Search size={15} /> Track
                    </Button>
                </form>

                {/* aria-live so the result is announced rather than silently
                    replacing the region below the form. */}
                <div className={styles.result} aria-live="polite">
                    {!submitted ? (
                        <p className={styles.idle}>
                            Waiting on a reference.
                        </p>
                    ) : match ? (
                        <Reveal>
                            <OrderCard order={match} />
                        </Reveal>
                    ) : (
                        <div className={styles.miss} role="status">
                            <p className={styles.missTitle}>
                                No order on this account matches{' '}
                                <span className={styles.missRef}>
                                    {submitted.trim()}
                                </span>
                            </p>
                            <p className={styles.missText}>
                                Check for a missing character, or open{' '}
                                <Link className={styles.link} to={ROUTES.orders}>
                                    your orders
                                </Link>{' '}
                                and read the reference straight off the card. If the
                                order was placed on a different account, you’ll need
                                to sign in to that one.
                            </p>
                        </div>
                    )}
                </div>

                <footer className={styles.foot}>
                    <p className={styles.footText}>
                        Tracking hasn’t moved for more than five working days? Mail{' '}
                        <a className={styles.link} href="mailto:support@vybe.com">
                            support@vybe.com
                        </a>{' '}
                        with the reference and we’ll chase the courier. Delivery
                        windows are on the{' '}
                        <Link className={styles.link} to={ROUTES.shipping}>
                            shipping page
                        </Link>
                        .
                    </p>
                </footer>
            </div>
        </Plate>
    );
}
