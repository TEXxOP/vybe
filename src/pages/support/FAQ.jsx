import { Link } from 'react-router-dom';

import Doc from '../../components/Doc';
import { ROUTES } from '../../lib/routes';
import { money } from '../../lib/format';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT } from '../../lib/cart';
import { COMPANY, emailHref } from '../../lib/company';
import { generalEnquiryHref } from '../../lib/enquiry';

/**
 * FAQ.
 *
 * This route was linked from the footer and never mounted, so every visitor who
 * clicked "FAQ" got an empty <main> — a blank white page with a header and a
 * footer and nothing between them.
 *
 * The accordion is native <details>/<summary>. No state, no JavaScript, no
 * aria-expanded to keep in sync, and Ctrl+F finds text inside closed answers
 * because the browser opens them for you. A div-and-className accordion gets
 * none of that for free.
 *
 * Every number here is interpolated from lib/cart's constants rather than typed.
 * The old build had ₹999 written into four files and 999 as a literal in three
 * more, which is precisely how the backend ended up charging delivery on an
 * order the cart had promised was free.
 */
export default function FAQ() {
    return (
        <Doc
            eyebrow="Questions"
            title="Frequently asked"
            lede="Enquiring, sizing, delivery and returns. If the answer you need isn’t here, message us and a person will reply."
            updated="2026-08-25"
        >
            <h2>Ordering</h2>

            <details>
                <summary>How do I order?</summary>
                <p>
                    You enquire, and we take it from there. Every product page has an{' '}
                    <strong>Enquire on WhatsApp</strong> button that opens a chat with
                    the item, size, colour and quantity already written out — or add
                    several things to your bag and send the whole list at once. We
                    confirm what’s in stock, the final figure including delivery, and
                    how you’d like to pay.
                </p>
            </details>

            <details>
                <summary>Do I need an account?</summary>
                <p>
                    Not to enquire — the WhatsApp chat needs nothing from you but a
                    message. An account is still useful if you want to keep a bag
                    between visits and see past orders in one place.{' '}
                    <Link to={ROUTES.register}>Create an account</Link> or{' '}
                    <Link to={ROUTES.login}>sign in</Link>.
                </p>
            </details>

            <details>
                <summary>Something sold out while it was in my bag. Why?</summary>
                <p>
                    Stock is checked when the order is placed, not when the item is
                    added, so a size can go while you’re deciding. We print in small
                    runs and we don’t restock a design once its run is finished, so
                    this happens more here than it would elsewhere. Stock is confirmed
                    when we reply to your enquiry, so you’ll hear it from us before
                    anything is agreed.
                </p>
            </details>

            <details>
                <summary>Can I change or cancel an order?</summary>
                <p>
                    Say so in the same WhatsApp chat, or cancel from{' '}
                    <Link to={ROUTES.orders}>your orders</Link> while the order is
                    still pending or confirmed. Once it’s been packed for dispatch,
                    cancelling is no longer possible from the site — mail{' '}
                    <a href={emailHref}>{COMPANY.email}</a> and we’ll
                    do what we can. We can’t edit the contents of an order; cancel
                    and reorder instead.
                </p>
            </details>

            <h2>Delivery and payment</h2>

            <details>
                <summary>What does delivery cost?</summary>
                <p>
                    {money(SHIPPING_FLAT)} flat, free on orders from{' '}
                    {money(FREE_SHIPPING_THRESHOLD)}. The threshold is measured on
                    the value of the items, before GST. Full detail on the{' '}
                    <Link to={ROUTES.shipping}>shipping page</Link>.
                </p>
            </details>

            <details>
                <summary>How long will it take?</summary>
                <p>
                    Two to three working days to leave us, four to seven working
                    days to reach you after that. Metro addresses land at the fast
                    end of that range and remote pin codes at the slow end.
                </p>
            </details>

            <details>
                <summary>How do I pay?</summary>
                <p>
                    We arrange it on WhatsApp once the order is confirmed — UPI or cash
                    on delivery, whichever suits you. Nothing is charged on this site
                    and there is no card form anywhere on it, which is deliberate: we’d
                    rather say that plainly than take a card number we have nowhere to
                    send.
                </p>
            </details>

            <details>
                <summary>Do you deliver outside India?</summary>
                <p>
                    Not yet — Indian states and union territories only. Ask on
                    WhatsApp if you’re somewhere else and we’ll tell you honestly
                    whether we can.
                </p>
            </details>

            <details>
                <summary>Where is my order?</summary>
                <p>
                    <Link to={ROUTES.trackOrder}>Track it here</Link>, or open{' '}
                    <Link to={ROUTES.orders}>your orders</Link> — both show the same
                    status. You’ll need to be signed in to the account that placed
                    the order.
                </p>
            </details>

            <h2>Sizing and fit</h2>

            <details>
                <summary>What size am I?</summary>
                <p>
                    Measure a garment you already like and compare it against the{' '}
                    <Link to={ROUTES.sizeGuide}>size guide</Link>, which lists flat
                    measurements in inches and centimetres. That’s more reliable
                    than measuring yourself, and much more reliable than guessing
                    from a label.
                </p>
            </details>

            <details>
                <summary>Do things run big or small?</summary>
                <p>
                    Tees and hoodies are cut boxy on purpose — wider through the
                    chest and shorter in the body than a standard fit. If you want
                    the drape to sit closer to the body, take your usual size; if
                    you want it oversized as intended, most people are happy one
                    size up.
                </p>
            </details>

            <h2>Returns</h2>

            <details>
                <summary>Can I return something?</summary>
                <p>
                    Within seven days of delivery, unworn and unwashed, with tags
                    on. The <Link to={ROUTES.returns}>returns page</Link> sets out
                    what qualifies and how to start one.
                </p>
            </details>

            <details>
                <summary>Can I exchange for another size?</summary>
                <p>
                    Effectively, yes — we treat it as a return plus a new order,
                    because a run can finish while a parcel is in transit and we
                    won’t hold stock we can’t promise. Tell us the size you want
                    when you write in and we’ll check whether it’s still there.
                </p>
            </details>

            <h2>The clothes</h2>

            <details>
                <summary>How should I wash this?</summary>
                <p>
                    Cold wash, inside out, no tumble dryer, no iron directly on a
                    print. Screen-printed ink survives washing well and heat badly.
                </p>
            </details>

            <details>
                <summary>Will a sold-out design come back?</summary>
                <p>
                    No. Every design is printed once, in a fixed run, and when it’s
                    gone the screens come down. That’s the whole idea, and it’s also
                    why the site tells you how few are left rather than hiding it.
                </p>
            </details>

            <hr />

            <p>
                Still stuck?{' '}
                <a
                    href={generalEnquiryHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Message us on WhatsApp
                </a>{' '}
                or mail <a href={emailHref}>{COMPANY.email}</a> — include your order
                number if you have one and you’ll skip a round trip.
            </p>
        </Doc>
    );
}
