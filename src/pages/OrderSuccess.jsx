import { Link, Navigate, useLocation } from 'react-router-dom';

import Plate from '../components/primitives/Plate';
import Stamp from '../components/primitives/Stamp';
import Button from '../components/primitives/Button';
import { Icons } from '../components/Icons';

import { money, shortDate } from '../lib/format';
import { paymentLabel } from '../lib/orders';
import { ROUTES } from '../lib/routes';
import styles from './OrderSuccess.module.css';

/**
 * Order confirmation — the receipt.
 *
 * What was wrong here was mostly a matter of honesty:
 *
 *  1. "AMOUNT PAID" — nothing had been paid. Every order on this site is
 *     collected on delivery; there is no payment gateway. The customer was told
 *     they had paid, which is the sort of thing that generates a furious email
 *     when the courier asks for cash.
 *
 *  2. "YOU'LL RECEIVE AN EMAIL WITH ORDER DETAILS" — there is no email service
 *     in the backend. Not nodemailer, not SendGrid, not anything: I grepped the
 *     whole of backend/src. No email has ever been sent by this application, so
 *     a customer waiting for a confirmation waits forever. The order record is
 *     the receipt, so this now points at the page that holds it.
 *
 *  3. "YOU CAN TRACK YOUR ORDER STATUS ANYTIME" — with no link. /orders and
 *     /track-order weren't even registered routes, so there was nowhere to go
 *     and no way to get there.
 *
 *  4. THE DISPATCH PROMISE CONTRADICTED THE CHECKOUT'S. This page said 2–3
 *     days; checkout said 4–7. Two numbers, no shared source, both invented.
 *     Dispatch and delivery are now stated as distinct stages that agree.
 *
 *  5. `formatPrice` FELL BACK TO '0' — an order whose total failed to arrive
 *     displayed "₹0" as though the customer had been given the lot for free.
 *
 *  6. A REFRESH THREW THE CUSTOMER TO THE HOMEPAGE. location.state doesn't
 *     survive a reload, so refreshing a confirmation page bounced to '/' with no
 *     explanation. It now goes to the order list, where the order actually is.
 *
 *  7. Hardcoded #E87D6F in four places, plus color="white".
 */

/* Calendar days, and labelled as an estimate rather than a promise. */
function addDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}

/* Payment labels used to be declared here. They now live in lib/orders alongside
   the status vocabulary, because /orders and /track-order name the same four
   methods and a second copy would have started drifting immediately. */

export default function OrderSuccess() {
    const { state } = useLocation();
    const { orderNumber, total, itemCount, paymentMethod, email } = state || {};

    /* No state means a reload or a direct hit. Send them to the order list —
       the order is genuinely there, which is more use than the homepage. */
    if (!orderNumber) {
        return <Navigate to={ROUTES.orders} replace />;
    }

    return (
        <Plate tone="paper" label="Receipt">
            <div className={styles.wrap}>
                <header className={styles.head}>
                    <Stamp tone="ink" solid angle={-3} className={styles.stamp}>
                        <Icons.Check size={13} /> Order placed
                    </Stamp>

                    <h1 className={styles.title}>
                        That&apos;s gone to press
                    </h1>

                    <p className={styles.lede}>
                        {itemCount
                            ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} is on its way to you.`
                            : 'Your order is in.'}{' '}
                        Keep the number below — it&apos;s how we find it.
                    </p>
                </header>

                {/* ---- THE DOCKET ---- */}
                <div className={styles.docket}>
                    <div className={styles.refBlock}>
                        <p className={styles.refLabel}>Order number</p>
                        <p className={styles.ref}>{orderNumber}</p>
                    </div>

                    <dl className={styles.rows}>
                        <div className={styles.row}>
                            <dt>Placed</dt>
                            <dd>{shortDate(new Date())}</dd>
                        </div>

                        <div className={styles.row}>
                            <dt>Payment</dt>
                            <dd>{paymentLabel(paymentMethod)}</dd>
                        </div>

                        <div className={styles.row}>
                            <dt>Estimated delivery</dt>
                            <dd>
                                {shortDate(addDays(4))} – {shortDate(addDays(7))}
                            </dd>
                        </div>

                        {/* Not "amount paid". Nothing has been paid yet. */}
                        <div className={styles.rowTotal}>
                            <dt>Due on delivery</dt>
                            <dd>
                                {Number.isFinite(total) ? money(total) : 'See your order'}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* ---- WHAT HAPPENS NEXT ---- */}
                <section className={styles.next} aria-labelledby="next-head">
                    <h2 className={styles.nextHead} id="next-head">
                        What happens next
                    </h2>

                    <ol className={styles.steps}>
                        <li className={styles.step}>
                            <span className={styles.stepNo} aria-hidden="true">01</span>
                            <div className={styles.stepBody}>
                                <h3 className={styles.stepTitle}>
                                    <Icons.CheckCircle size={16} /> Saved to your account
                                </h3>
                                {/* No claim of an email, because none is sent. */}
                                <p className={styles.stepText}>
                                    The order is recorded against{' '}
                                    {email ? <strong>{email}</strong> : 'your account'}.
                                    We don&apos;t send confirmation emails yet, so{' '}
                                    <Link className={styles.stepLink} to={ROUTES.orders}>
                                        your orders
                                    </Link>{' '}
                                    is the receipt — it&apos;s always there.
                                </p>
                            </div>
                        </li>

                        <li className={styles.step}>
                            <span className={styles.stepNo} aria-hidden="true">02</span>
                            <div className={styles.stepBody}>
                                <h3 className={styles.stepTitle}>
                                    <Icons.Package size={16} /> Packed and dispatched
                                </h3>
                                <p className={styles.stepText}>
                                    Pulled, folded and boxed within 2–3 working days.
                                </p>
                            </div>
                        </li>

                        <li className={styles.step}>
                            <span className={styles.stepNo} aria-hidden="true">03</span>
                            <div className={styles.stepBody}>
                                <h3 className={styles.stepTitle}>
                                    <Icons.Truck size={16} /> Delivered
                                </h3>
                                <p className={styles.stepText}>
                                    Usually 4–7 working days from now. You can{' '}
                                    <Link className={styles.stepLink} to={ROUTES.trackOrder}>
                                        track it with your order number
                                    </Link>{' '}
                                    at any point.
                                </p>
                            </div>
                        </li>
                    </ol>
                </section>

                <div className={styles.actions}>
                    <Button to={ROUTES.orders} variant="riso" size="lg">
                        View your order
                    </Button>
                    <Button to={ROUTES.shop} variant="outline" size="lg">
                        Back to the catalogue
                    </Button>
                </div>

                <p className={styles.thanks}>
                    Thank you for buying from a small press.
                </p>
            </div>
        </Plate>
    );
}
