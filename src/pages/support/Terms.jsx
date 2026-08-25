import { Link } from 'react-router-dom';

import Doc from '../../components/Doc';
import { ROUTES } from '../../lib/routes';
import { money } from '../../lib/format';
import {
    FREE_SHIPPING_THRESHOLD,
    SHIPPING_FLAT,
    GST_RATE,
    MAX_PER_LINE,
} from '../../lib/cart';
import { COMPANY, emailHref, addressOneLine } from '../../lib/company';

/**
 * Terms of service.
 *
 * The numbers come from lib/cart for the same reason they do on the shipping
 * page: a term of sale that contradicts the checkout total isn't a term, it's a
 * dispute. That includes the per-line quantity cap, which is a real limit
 * enforced by the cart and the product page and therefore belongs in the terms
 * rather than only in a disabled "+" button.
 *
 * Notably absent: any claim that we may terminate accounts at our sole
 * discretion, that we can change these terms retroactively, or that your use of
 * the site constitutes agreement to a document you were never shown. Those
 * clauses are conventional and this document is shorter without them.
 */
export default function Terms() {
    return (
        <Doc
            eyebrow="Terms"
            title="Terms of service"
            lede="The agreement between you and us when you buy something here. Plain language, and short enough to read."
            updated="2026-08-25"
        >
            <h2>Who we are</h2>

            <p>
                VYBE is a small-batch streetwear label printing and selling in
                India. It is a brand of <strong>{COMPANY.legalName}</strong>, the
                company you are contracting with, registered at {addressOneLine()}. In
                this document “we” and “us” mean that company, and “you” means whoever
                is using the site. Reach us at{' '}
                <a href={emailHref}>{COMPANY.email}</a> or on WhatsApp at{' '}
                {COMPANY.phoneDisplay}.
            </p>

            <h2>Your account</h2>

            <p>
                You don’t need an account to enquire, but if you keep one the
                details on it need to be accurate — a wrong phone number is the single
                most common reason a parcel comes back to us. Keep your password to
                yourself; anything
                done from a signed-in session is treated as done by you. Tell us
                straight away if you think somebody else has got in.
            </p>

            <p>
                One person, one account. We may close accounts used to place
                fraudulent orders or to buy limited runs for resale at volume, and
                we’ll tell you why if we do.
            </p>

            <h2>Orders</h2>

            <p>
                Adding something to your bag isn’t a purchase, and sending us an
                enquiry isn’t yet a contract — it’s the start of a conversation. The
                contract forms when we confirm your order, and its price and contents,
                in writing. That gap matters here more than at most shops, because we
                print in fixed runs: if the last one in your size goes while your
                order is being packed, we’ll cancel that line and tell you rather than
                substitute something.
            </p>

            <p>
                You can order up to {MAX_PER_LINE} of any single item, size and colour
                in one order. Stock permitting, and where a size has fewer than that
                left, the smaller number wins.
            </p>

            <h2>Prices and payment</h2>

            <dl>
                <dt>Currency</dt>
                <dd>Indian rupees, throughout.</dd>

                <dt>GST</dt>
                <dd>
                    {Math.round(GST_RATE * 100)}%, included in the figure we confirm
                    and shown on its own line.
                </dd>

                <dt>Delivery</dt>
                <dd>
                    {money(SHIPPING_FLAT)}, or free from{' '}
                    {money(FREE_SHIPPING_THRESHOLD)} of items. See{' '}
                    <Link to={ROUTES.shipping}>shipping</Link>.
                </dd>

                <dt>Payment</dt>
                <dd>
                    Arranged directly with you once the order is confirmed — UPI, or
                    cash to the courier on arrival. This site takes no payments and
                    stores no card details, because no gateway is connected to it.
                </dd>
            </dl>

            <p>
                The price we confirm to you in writing is the price we’ll honour —
                listed prices are an invitation to enquire, not a binding offer. If a
                product is listed at an obviously wrong price — a decimal in the wrong
                place — we’ll say so and cancel rather than hold either of us to it or
                quietly charge you the difference.
            </p>

            <h2>Delivery</h2>

            <p>
                We deliver within India only. The windows on the{' '}
                <Link to={ROUTES.shipping}>shipping page</Link> are estimates in
                working days, not guarantees; risk in the goods passes to you on
                delivery. If a parcel is lost or damaged in transit, that’s ours to
                fix — see <Link to={ROUTES.returns}>returns</Link>.
            </p>

            <h2>Cancelling and returning</h2>

            <p>
                You can cancel by telling us, or from{' '}
                <Link to={ROUTES.orders}>your orders</Link>, while the order is pending
                or confirmed. After that, and after delivery, the{' '}
                <Link to={ROUTES.returns}>returns policy</Link> applies: seven days
                from delivery, unworn, tags on. Nothing in these terms reduces your
                rights under the Consumer Protection Act, 2019.
            </p>

            <h2>The clothes</h2>

            <p>
                These are screen-printed, cut-and-sew garments made in small runs.
                Measurements vary by around half an inch, print placement varies
                slightly between pieces, and colours vary a little between batches and
                a lot between screens — that’s the nature of the process, and it isn’t
                a defect. Your monitor is also not a colour-managed proof. Genuine
                faults — a misprint, a bad seam, the wrong item — are always ours.
            </p>

            <h2>The site itself</h2>

            <p>
                The designs, photographs, text and code here are ours. Read the site,
                share links to it, screenshot it — all fine. Reproducing the artwork
                on garments or merchandise of your own is not.
            </p>

            <p>
                Please don’t attempt to break, overload or scrape the site, or to
                reach parts of it that aren’t yours. We keep the right to take it
                offline for maintenance without notice, and we don’t promise it will
                never be down.
            </p>

            <h2>Liability</h2>

            <p>
                If we get something wrong, our responsibility is limited to the value
                of the order concerned — repairing it, replacing it, or refunding it.
                We aren’t liable for indirect losses, such as a parcel arriving after
                the occasion you bought it for. Nothing here limits liability for
                death, personal injury or fraud, because that can’t be limited.
            </p>

            <h2>Governing law</h2>

            <p>
                These terms are governed by the laws of India, and the courts of India
                have jurisdiction over any dispute. If part of this document turns out
                to be unenforceable, the rest still stands.
            </p>

            <h2>Changes</h2>

            <p>
                We may update these terms; the revision date at the top will say when.
                Whichever version was published on the day you ordered is the one that
                governs that order.
            </p>

            <hr />

            <p>
                Also worth reading: our{' '}
                <Link to={ROUTES.privacy}>privacy policy</Link> and the{' '}
                <Link to={ROUTES.faq}>FAQ</Link>.
            </p>
        </Doc>
    );
}
