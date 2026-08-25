import { Link } from 'react-router-dom';

import Doc from '../../components/Doc';
import { ROUTES } from '../../lib/routes';
import { COMPANY, emailHref } from '../../lib/company';

/**
 * Returns and refunds.
 *
 * Written against what the software can actually do. There is no returns portal
 * in this codebase — no route, no controller, no model field — so this page does
 * not pretend there is one. It says "mail us", because that is the mechanism
 * that exists.
 *
 * Refund timing is described in terms of when we send the money rather than when
 * it appears, since the second half of that journey belongs to a bank and we
 * can't promise on its behalf. And because every order so far is cash on
 * delivery, the default refund path is a bank transfer, not a card reversal —
 * saying "refunded to your original payment method" would be meaningless when
 * the original payment method was a courier holding cash.
 */
export default function Returns() {
    return (
        <Doc
            eyebrow="Returns"
            title="Returns & refunds"
            lede="Seven days from delivery, unworn, with tags on. Here's exactly what that means and what happens after you write in."
            updated="2026-08-25"
        >
            <h2>The window</h2>

            <p>
                You have <strong>seven days from the day your parcel arrives</strong>{' '}
                to start a return. We go by the courier’s delivery date, not the
                dispatch date, so a slow parcel doesn’t eat into your week.
            </p>

            <h2>What we can take back</h2>

            <ul>
                <li>Unworn and unwashed, with the original tags still attached.</li>
                <li>
                    In a condition we could reasonably send to somebody else. Trying
                    something on is expected; wearing it out is not.
                </li>
                <li>
                    Anything that arrived damaged, misprinted, or in a size other
                    than the one on your order — always, and the postage is ours.
                </li>
            </ul>

            <h2>What we can’t</h2>

            <ul>
                <li>Worn, washed, altered or noticeably scented garments.</li>
                <li>Items with the tags removed.</li>
                <li>Anything sent back after the seven days have run out.</li>
            </ul>

            <aside>
                <p>
                    Please don’t post anything back before writing to us. An
                    unannounced parcel has no order number attached to it, which
                    means we can’t match it to you and can’t refund it.
                </p>
            </aside>

            <h2>How to start one</h2>

            <ol>
                <li>
                    Mail <a href={emailHref}>{COMPANY.email}</a> from
                    the address on the account.
                </li>
                <li>
                    Include your order number — it begins <strong>VYBE</strong> and
                    it’s on <Link to={ROUTES.orders}>your orders</Link> — plus which
                    item, and one line on what’s wrong. Photographs if it’s damage.
                </li>
                <li>
                    We reply within two working days with a return address and a
                    reference to write on the parcel.
                </li>
                <li>
                    Send it back. Keep the postage receipt until the refund lands.
                </li>
            </ol>

            <h2>Postage</h2>

            <dl>
                <dt>Our mistake</dt>
                <dd>
                    We pay. Damaged, misprinted, or the wrong item or size — we
                    refund your return postage along with the order.
                </dd>

                <dt>Change of mind</dt>
                <dd>
                    You pay to send it back. The delivery charge on the original
                    order isn’t refunded, since that journey already happened.
                </dd>
            </dl>

            <h2>Refunds</h2>

            <p>
                We check the parcel within two working days of it reaching us and
                send the refund the same day it passes. Because orders are paid in
                cash on delivery, refunds go by bank transfer — we’ll ask for account
                details once the return is approved, and never before. How quickly it
                then shows up is your bank’s business; three to five working days is
                typical.
            </p>

            <p>
                If a return doesn’t pass the check we’ll tell you why, with
                photographs, and send it back to you at our cost rather than quietly
                keeping it.
            </p>

            <h2>Exchanges</h2>

            <p>
                We don’t hold stock against an incoming parcel, because a run can
                finish while it’s in transit and we won’t promise something we might
                not have. So an exchange is a return plus a new order. Mention the
                size you want when you write in and we’ll tell you whether it’s still
                available before you post anything — if it’s the last one, that’s
                worth knowing first.
            </p>

            <h2>Cancelling instead</h2>

            <p>
                If it hasn’t shipped, cancelling is cleaner than returning. You can
                do it yourself from <Link to={ROUTES.orders}>your orders</Link> while
                the order is still pending or confirmed, and nothing is charged
                because nothing has been collected.
            </p>

            <small>
                None of this limits your rights under the Consumer Protection Act,
                2019. Where that Act gives you more than this page does, it wins.
            </small>
        </Doc>
    );
}
