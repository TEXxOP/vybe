import { Link } from 'react-router-dom';

import Doc from '../../components/Doc';
import { ROUTES } from '../../lib/routes';

/**
 * Privacy.
 *
 * Written from the schema outward rather than from a template inward. Every field
 * listed below is a field that exists: the account list is
 * backend/src/models/User.model.js, the address list is `shippingAddress` in
 * Order.model.js, and the two browser-storage keys are the two this client
 * actually writes (`vybe_token`, `vybe_user` — grep for them).
 *
 * It also states what we do NOT hold, which is the more useful half. No payment
 * gateway is wired up anywhere in this codebase, so we have never received a card
 * number and cannot claim to protect one. There is no analytics script, no
 * advertising pixel and no mail service in the project either. A privacy policy
 * that lists third parties we don't use in order to sound thorough is worse than
 * no policy, because it's the part a reader can't verify.
 */
export default function Privacy() {
    return (
        <Doc
            eyebrow="Privacy"
            title="Privacy policy"
            lede="What we hold, why we hold it, and how to get rid of it. Short, because we collect very little."
            updated="2026-08-25"
        >
            <h2>What we collect</h2>

            <dl>
                <dt>Your account</dt>
                <dd>
                    Name, email address and password. The password is stored only as
                    a bcrypt hash — we can’t read it, and neither can anyone who
                    obtains the database. We also keep a phone number and saved
                    addresses if you give us them, and the date you last signed in.
                </dd>

                <dt>Your orders</dt>
                <dd>
                    What you bought, in which size and colour, what it cost, and the
                    delivery details you typed at checkout: name, phone, street,
                    city, state and pin code. Also which payment method you chose and
                    the order’s current status.
                </dd>

                <dt>Your bag</dt>
                <dd>
                    The items in your cart, tied to your account so it survives a
                    closed tab and a different device.
                </dd>

                <dt>On your device</dt>
                <dd>
                    Two entries in your browser’s local storage:{' '}
                    <strong>vybe_token</strong>, which keeps you signed in, and{' '}
                    <strong>vybe_user</strong>, which holds your name and email so
                    the header can greet you without a round trip. Clearing your
                    browser data removes both and signs you out. We set no
                    advertising or tracking cookies.
                </dd>
            </dl>

            <h2>What we don’t collect</h2>

            <ul>
                <li>
                    <strong>Card and bank details.</strong> No payment gateway is
                    connected to this site. Orders are collected in cash on delivery,
                    so we have never held a card number and there is nothing of that
                    kind for us to lose.
                </li>
                <li>
                    <strong>Analytics and advertising.</strong> There is no
                    third-party analytics script, no advertising pixel and no
                    social-media tracker on any page here.
                </li>
                <li>
                    <strong>Anything about you from anyone else.</strong> We don’t
                    buy or enrich customer data.
                </li>
            </ul>

            <h2>Why we hold it</h2>

            <p>
                To take an order, print it, get it to your door, let you look it up
                afterwards, and answer you when you write in. That is the entire
                purpose. We don’t profile customers and we don’t use your order
                history to decide what you’re shown.
            </p>

            <h2>Who else sees it</h2>

            <p>
                Only the people who have to. A delivery partner receives the name,
                phone number and address on the parcel, because that is how a parcel
                arrives. Our database is hosted with an infrastructure provider who
                stores it but has no reason to read it. Beyond that, nobody — we
                don’t sell, rent or share customer data, and we won’t start without
                telling you on this page first.
            </p>

            <p>
                We’ll hand over data if a court or a law-enforcement authority
                lawfully requires it, and no further than the requirement.
            </p>

            <h2>How long we keep it</h2>

            <dl>
                <dt>Order records</dt>
                <dd>
                    Retained while they’re needed for tax and accounting — currently
                    eight financial years, which is what Indian record-keeping rules
                    ask for. These survive account deletion, in a form limited to the
                    transaction.
                </dd>

                <dt>Account details</dt>
                <dd>Kept until you ask us to delete them.</dd>

                <dt>Support email</dt>
                <dd>Kept for two years, so we have the thread if you write again.</dd>
            </dl>

            <h2>Your say over it</h2>

            <p>
                Mail <a href="mailto:support@vybe.com">support@vybe.com</a> from the
                address on your account and you can ask us to:
            </p>

            <ul>
                <li>Send you a copy of everything we hold about you.</li>
                <li>Correct anything that’s wrong.</li>
                <li>
                    Delete your account. We’ll remove your profile, addresses and
                    bag; order records stay, for the reason above.
                </li>
            </ul>

            <p>
                We’ll come back to you within thirty days, and we won’t charge you
                for asking.
            </p>

            <h2>Keeping it safe</h2>

            <p>
                Passwords are hashed with bcrypt. Sessions use signed tokens that
                expire. Admin pages are gated on the server, not merely hidden in the
                interface. That said, no service is unbreakable — if we ever have a
                breach that affects you, we’ll tell you what happened and what to do
                about it rather than wait to be asked.
            </p>

            <h2>Children</h2>

            <p>
                This shop isn’t aimed at children under 13 and we don’t knowingly
                keep their data. If you believe we have some, write in and we’ll
                remove it.
            </p>

            <h2>Changes</h2>

            <p>
                If this policy changes we’ll update the revision date at the top. If a
                change actually affects what we do with your data — rather than just
                the wording — we’ll email account holders instead of quietly editing
                the page.
            </p>

            <hr />

            <p>
                Questions about any of this:{' '}
                <a href="mailto:support@vybe.com">support@vybe.com</a>. See also our{' '}
                <Link to={ROUTES.terms}>terms of service</Link>.
            </p>
        </Doc>
    );
}
