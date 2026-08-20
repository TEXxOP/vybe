import { Link } from 'react-router-dom';

import Doc from '../../components/Doc';
import { ROUTES } from '../../lib/routes';
import { money } from '../../lib/format';
import {
    FREE_SHIPPING_THRESHOLD,
    SHIPPING_FLAT,
    GST_RATE,
} from '../../lib/cart';

/**
 * Shipping and delivery.
 *
 * The charges, the threshold and the tax rate are all read from lib/cart, which
 * is the same module the cart, the checkout docket and the order total use. A
 * shipping page is the one page on a shop where the copy and the arithmetic
 * absolutely must agree, and the only way to guarantee that is to make them the
 * same number rather than two numbers that happen to match today.
 *
 * The stated windows are working days, and they're stated as two separate stages
 * — dispatch, then transit — because the previous confirmation page said "2–3
 * business days" in one paragraph and "4–7 business days" in the next, leaving
 * the customer to guess which one was the delivery date.
 */
export default function Shipping() {
    return (
        <Doc
            eyebrow="Delivery"
            title="Shipping"
            lede="What it costs, when it leaves, and when it lands. Everything below is measured in working days — Monday to Saturday, excluding public holidays."
            updated="2026-08-25"
        >
            <h2>Charges</h2>

            <dl>
                <dt>Standard delivery</dt>
                <dd>{money(SHIPPING_FLAT)}, anywhere we deliver in India.</dd>

                <dt>Free delivery</dt>
                <dd>
                    On orders from {money(FREE_SHIPPING_THRESHOLD)} upwards — a
                    subtotal of exactly {money(FREE_SHIPPING_THRESHOLD)} qualifies.
                    The threshold is measured on the value of the items in your bag,
                    before GST and before delivery — so the figure you’re watching is
                    the subtotal shown at the top of the cart summary.
                </dd>

                <dt>GST</dt>
                <dd>
                    {Math.round(GST_RATE * 100)}%, added at checkout and listed as
                    its own line so you can see it rather than infer it.
                </dd>

                <dt>Cash-on-delivery fee</dt>
                <dd>None. Paying at the door costs the same as paying up front.</dd>
            </dl>

            <aside>
                <p>
                    The cart shows how much more you’d need to add to cross the
                    free-delivery threshold, and the bar next to it measures your
                    actual subtotal against it. If it says free, the total you’re
                    shown is the total you pay.
                </p>
            </aside>

            <h2>Timings</h2>

            <p>
                An order moves through two stages, and they add together. Nothing
                below is a guarantee — couriers have weather, festivals and strikes
                like everyone else — but it is what we actually plan against.
            </p>

            <dl>
                <dt>Dispatch</dt>
                <dd>
                    Two to three working days from the moment the order is placed.
                    We print and pack in batches rather than continuously, which is
                    why this stage isn’t same-day.
                </dd>

                <dt>Transit</dt>
                <dd>
                    Four to seven working days after dispatch. Metro addresses tend
                    to arrive at the fast end, remote pin codes at the slow end.
                </dd>

                <dt>Total, typically</dt>
                <dd>
                    Six to ten working days from order to doorstep. The estimate on
                    your confirmation page is calculated from the day you ordered.
                </dd>
            </dl>

            <h2>Where we deliver</h2>

            <p>
                All Indian states and union territories. Checkout lists them, and it
                won’t accept an address outside that list, because cash on delivery
                doesn’t work internationally and no other payment method is live
                yet. We aren’t shipping outside India at present and we’d rather say
                so here than let you fill in a form that can’t be submitted.
            </p>

            <h2>Tracking</h2>

            <p>
                Every order has a number beginning <strong>VYBE</strong>, shown on
                your confirmation page and on{' '}
                <Link to={ROUTES.orders}>your orders</Link>. Put it into{' '}
                <Link to={ROUTES.trackOrder}>track order</Link> to see the current
                stage. Both need you signed in to the account that placed the order
                — an order number alone isn’t proof it’s yours, and we won’t show
                somebody’s address to anyone who can guess a reference.
            </p>

            <h2>If something goes wrong</h2>

            <p>
                If the tracking hasn’t moved for more than five working days, or a
                parcel arrives damaged, mail{' '}
                <a href="mailto:support@vybe.com">support@vybe.com</a> with your
                order number. Photographs help for damage — of the parcel as well as
                the garment, because that tells us whether to argue with the courier
                or with ourselves. Damage in transit is on us, and it isn’t counted
                against the{' '}
                <Link to={ROUTES.returns}>seven-day return window</Link>.
            </p>

            <small>
                Working days exclude Sundays and public holidays. Orders placed after
                4pm are counted from the next working day.
            </small>
        </Doc>
    );
}
