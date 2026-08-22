import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';

import Plate from '../components/primitives/Plate';
import Stamp from '../components/primitives/Stamp';
import Button from '../components/primitives/Button';
import Field from '../components/primitives/Field';
import { Icons } from '../components/Icons';

import { useCart } from '../context/CartContext';
import { ordersAPI } from '../services/api';
import { money } from '../lib/format';
import { computeTotals } from '../lib/cart';
import { ROUTES } from '../lib/routes';
import styles from './Checkout.module.css';

/**
 * Checkout — the order form.
 *
 * This page had the most serious defect in the entire build:
 *
 *  1. GUEST CHECKOUT INVENTED ORDERS THAT DID NOT EXIST. If you weren't logged
 *     in, the old code did this:
 *
 *         const orderNumber = 'ORD' + Date.now().toString().slice(-8);
 *         clearCart();
 *         navigate('/order-success', { state: { orderNumber, total } });
 *
 *     No request was made. Nothing was recorded. The customer's cart was
 *     emptied and they were shown a confirmation screen with a fabricated
 *     order number for a purchase that never happened. `backend/src/routes/
 *     order.routes.js` does `router.use(protect)`, so there is no guest order
 *     endpoint to call — the honest fix is to require an account, and to say so
 *     before the customer fills in an address.
 *
 *  2. `navigate('/cart')` WAS CALLED IN THE RENDER BODY. Navigating is a side
 *     effect; performing it during render is undefined behaviour in React and
 *     warns in development. Worse, it raced the successful path: placing an
 *     order empties the cart, which re-rendered this component, which
 *     redirected to /cart — so a customer whose order HAD gone through could be
 *     bounced back to an empty bag and never see their order number. It is now
 *     a declarative <Navigate replace/>, guarded by `placed`.
 *
 *  3. THE ORDER TOTAL SHOWN ON THE CONFIRMATION WAS COMPUTED IN THE BROWSER,
 *     not read from the order the server actually created. The success page now
 *     receives `order.totalPrice`, which is the number the customer will be
 *     charged. (While checking this I found the server used `> 999` where the
 *     storefront used `>= 999`; at a subtotal of exactly ₹999 the two disagreed
 *     by ₹99. Fixed in order.controller.js.)
 *
 *  4. `alert('Failed to place order. Please try again.')` THREW AWAY THE
 *     REASON. The server distinguishes an empty cart from an incomplete
 *     address; both arrived as the same useless sentence in a modal.
 *
 *  5. NO LABEL WAS ASSOCIATED WITH ANY INPUT — eleven bare <label> elements
 *     with no htmlFor, so clicking a label did nothing and a screen reader
 *     announced unnamed fields. On a checkout. The Field primitive fixes this
 *     structurally.
 *
 *  6. NO autocomplete ATTRIBUTES, so the browser could not autofill a single
 *     field of an address form — the one form where autofill matters most.
 *     Phone and pincode also lacked inputMode, so mobile keyboards opened on
 *     QWERTY for digit-only fields.
 *
 *  7. IT WASN'T A <form>. A div and a button: Enter didn't submit.
 *
 *  8. THE VALIDATION MESSAGE FOR AN EMPTY PHONE WAS WRONG. Both checks wrote to
 *     the same key unconditionally, so the "required" message was immediately
 *     overwritten by "Enter valid 10-digit phone". Same bug for pincode.
 *
 *  9. THE STATE DROPDOWN LISTED 11 OF INDIA'S 36 STATES AND UNION TERRITORIES,
 *     plus "Other" — so a customer in Kerala or Assam had to file themselves
 *     under Other, and the shipping label would say so.
 *
 * 10. `user?.name` WAS READ INTO useState ON FIRST RENDER ONLY. Refreshing
 *     straight onto /checkout mounted this before the auth check resolved, so
 *     `user` was null and the prefill was silently lost. The form is now a
 *     child that only mounts once auth is known, so its initial state is
 *     correct by construction rather than by an effect that re-syncs it.
 *
 * 11. HARDCODED #E87D6F IN SIX PLACES — the old coral, passed as an icon prop
 *     where no token could reach it.
 */

/* All 28 states and 8 union territories. A checkout that cannot express the
   customer's address is not a checkout. */
const STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry',
];

/* The backend enum is ['cod', 'card', 'upi', 'netbanking']. No payment gateway
   is wired up, so nothing here charges a card — see the note rendered under
   these options. Offering a card field that silently does nothing would be
   worse than saying so plainly. */
const PAYMENTS = [
    {
        value: 'cod',
        icon: 'Cash',
        title: 'Cash on delivery',
        note: 'Pay the courier when it arrives',
    },
    {
        value: 'upi',
        icon: 'Smartphone',
        title: 'UPI',
        note: 'GPay, PhonePe, Paytm',
    },
    {
        value: 'card',
        icon: 'CreditCard',
        title: 'Card',
        note: 'Visa, Mastercard, RuPay',
    },
];

const BLANK = {
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
};

function validate(form) {
    const errors = {};

    if (!form.name.trim()) errors.name = 'We need a name for the parcel.';

    /* Each field writes its message once. The previous version ran the format
       check unconditionally, overwriting "required" with "invalid". */
    if (!form.phone.trim()) errors.phone = 'A phone number is required for delivery.';
    else if (!/^\d{10}$/.test(form.phone.trim()))
        errors.phone = 'That should be 10 digits, no spaces or country code.';

    if (!form.street.trim()) errors.street = 'A street address is required.';
    if (!form.city.trim()) errors.city = 'A city is required.';
    if (!form.state) errors.state = 'Choose a state.';

    if (!form.pincode.trim()) errors.pincode = 'A pincode is required.';
    else if (!/^\d{6}$/.test(form.pincode.trim()))
        errors.pincode = 'Indian pincodes are 6 digits.';

    return errors;
}

function CheckoutForm({ user }) {
    const { cart, clearCart, cartLoading } = useCart();
    const navigate = useNavigate();

    /* Mounted only once auth is known, so reading user here is safe. */
    const [form, setForm] = useState({ ...BLANK, name: user.name || '' });
    const [payment, setPayment] = useState('cod');
    const [errors, setErrors] = useState({});
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);
    const [placed, setPlaced] = useState(false);

    const items = Array.isArray(cart?.items) ? cart.items : [];
    const totals = computeTotals(cart?.totalPrice || 0);

    const change = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        /* Clear this field's error as soon as it's touched, but leave the
           others — retyping a pincode shouldn't wipe the message under the
           phone field. */
        setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
        setFailure('');
    };

    const submit = async (e) => {
        e.preventDefault();

        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length > 0) {
            setFailure('');
            return;
        }

        setBusy(true);
        setFailure('');
        try {
            const data = await ordersAPI.create({
                shippingAddress: {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    street: form.street.trim(),
                    city: form.city.trim(),
                    state: form.state,
                    pincode: form.pincode.trim(),
                    country: form.country,
                },
                paymentMethod: payment,
            });

            /* Set before navigating. The server empties the cart as part of
               creating the order, so this component is about to re-render with
               zero items — and without this flag the empty-cart guard below
               would redirect a paying customer to /cart instead of their
               confirmation. */
            setPlaced(true);

            navigate(ROUTES.orderSuccess, {
                replace: true,
                state: {
                    orderNumber: data.order?.orderNumber,
                    /* The server's figure, not ours. If the two ever disagree,
                       the customer should see the one they'll be charged. */
                    total: data.order?.totalPrice ?? totals.total,
                    itemCount: cart.totalItems || items.length,
                    paymentMethod: payment,
                    email: user.email,
                },
            });

            clearCart();
        } catch (err) {
            /* The reason, not a shrug. The server says "Cart is empty" or
               "Please provide complete shipping address"; both are actionable
               and both used to be replaced by the same alert(). */
            setFailure(
                err?.message ||
                    'The order could not be placed. Nothing has been charged — please try again.'
            );
            setBusy(false);
        }
    };

    /* An unfetched cart is not an empty one. */
    if (cartLoading && items.length === 0 && !placed) {
        return (
            <Plate tone="paper" label="Order form · loading">
                <p className={styles.loading} aria-live="polite">
                    Checking your bag…
                </p>
            </Plate>
        );
    }

    /* Declarative, and only when there is genuinely nothing to buy. */
    if (items.length === 0 && !placed) {
        return <Navigate to={ROUTES.cart} replace />;
    }

    return (
        <Plate tone="paper" label="Order form">
            <header className={styles.masthead}>
                <p className={styles.eyebrow}>Final proof</p>
                <h1 className={styles.title}>Checkout</h1>
                <p className={styles.lede}>
                    Two things to confirm and it goes to press.
                </p>
            </header>

            <form className={styles.layout} onSubmit={submit} noValidate>
                <div className={styles.main}>
                    {/* ---- 01 ADDRESS ---- */}
                    <section className={styles.step} aria-labelledby="step-address">
                        <div className={styles.stepHead}>
                            <span className={styles.stepNo} aria-hidden="true">01</span>
                            <h2 className={styles.stepTitle} id="step-address">
                                <Icons.MapPin size={17} /> Where it ships
                            </h2>
                        </div>

                        <div className={styles.grid}>
                            <Field
                                className={styles.wide}
                                label="Full name"
                                name="name"
                                value={form.name}
                                onChange={change}
                                error={errors.name}
                                required
                                autoComplete="name"
                            />

                            <Field
                                label="Phone"
                                name="phone"
                                type="tel"
                                value={form.phone}
                                onChange={change}
                                error={errors.phone}
                                required
                                autoComplete="tel-national"
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="9876543210"
                                hint="For delivery updates only."
                            />

                            <Field
                                label="Pincode"
                                name="pincode"
                                value={form.pincode}
                                onChange={change}
                                error={errors.pincode}
                                required
                                autoComplete="postal-code"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="110001"
                            />

                            <Field
                                className={styles.wide}
                                label="Street address"
                                name="street"
                                as="textarea"
                                rows={3}
                                value={form.street}
                                onChange={change}
                                error={errors.street}
                                required
                                autoComplete="street-address"
                                placeholder="Flat or house number, building, street, area"
                            />

                            <Field
                                label="City"
                                name="city"
                                value={form.city}
                                onChange={change}
                                error={errors.city}
                                required
                                autoComplete="address-level2"
                            />

                            <Field
                                label="State"
                                name="state"
                                as="select"
                                value={form.state}
                                onChange={change}
                                error={errors.state}
                                required
                                autoComplete="address-level1"
                            >
                                <option value="">Choose a state…</option>
                                {STATES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </Field>
                        </div>
                    </section>

                    {/* ---- 02 PAYMENT ---- */}
                    <section className={styles.step}>
                        <div className={styles.stepHead}>
                            <span className={styles.stepNo} aria-hidden="true">02</span>
                            <h2 className={styles.stepTitle}>
                                <Icons.Wallet size={17} /> How you&apos;ll pay
                            </h2>
                        </div>

                        {/* A real fieldset with a legend, so the group has a
                            name. Previously three bare labels. */}
                        <fieldset className={styles.fieldset}>
                            <legend className="visuallyHidden">Payment method</legend>

                            <div className={styles.payGrid}>
                                {PAYMENTS.map((option) => {
                                    const Icon = Icons[option.icon];
                                    const on = payment === option.value;
                                    return (
                                        <label
                                            key={option.value}
                                            className={styles.pay}
                                            data-on={on ? 'true' : 'false'}
                                        >
                                            <input
                                                className={styles.payInput}
                                                type="radio"
                                                name="payment"
                                                value={option.value}
                                                checked={on}
                                                onChange={(e) => setPayment(e.target.value)}
                                            />
                                            <span className={styles.payIcon} aria-hidden="true">
                                                <Icon size={20} />
                                            </span>
                                            <span className={styles.payText}>
                                                <strong className={styles.payTitle}>
                                                    {option.title}
                                                </strong>
                                                <span className={styles.payNote}>
                                                    {option.note}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {/* Said out loud rather than implied. There is no payment
                            gateway behind this form; pretending otherwise is the
                            kind of lie that ends up in a support ticket. */}
                        <p className={styles.payDisclosure}>
                            Card and UPI aren&apos;t live yet — choosing one tells us what
                            you&apos;d prefer, and we&apos;ll collect payment on delivery
                            either way. Nothing is charged now.
                        </p>
                    </section>
                </div>

                {/* ---- DOCKET ---- */}
                <aside className={styles.docket} aria-labelledby="docket-head">
                    <h2 className={styles.docketHead} id="docket-head">
                        Your order
                    </h2>

                    <ul className={styles.items}>
                        {items.map((item) => (
                            <li className={styles.item} key={item._id}>
                                <span className={styles.itemQty} aria-hidden="true">
                                    {item.quantity}×
                                </span>
                                <span className={styles.itemBody}>
                                    <span className={styles.itemName}>
                                        {item.product?.name || 'Item'}
                                    </span>
                                    {item.size || item.color ? (
                                        <span className={styles.itemMeta}>
                                            {[item.size, item.color]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </span>
                                    ) : null}
                                </span>
                                <span className={styles.itemPrice}>
                                    {money((item.price || 0) * (item.quantity || 0))}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <dl className={styles.rows}>
                        <div className={styles.row}>
                            <dt>Subtotal</dt>
                            <dd>{money(totals.subtotal)}</dd>
                        </div>
                        <div className={styles.row}>
                            <dt>Delivery</dt>
                            <dd className={totals.freeShipping ? styles.free : undefined}>
                                {totals.freeShipping ? 'Free' : money(totals.shipping)}
                            </dd>
                        </div>
                        <div className={styles.row}>
                            <dt>GST (18%)</dt>
                            <dd>{money(totals.tax)}</dd>
                        </div>
                        <div className={styles.rowTotal}>
                            <dt>Total</dt>
                            <dd>{money(totals.total)}</dd>
                        </div>
                    </dl>

                    <Button type="submit" variant="riso" size="lg" full loading={busy}>
                        <Icons.Lock size={16} /> Place order · {money(totals.total)}
                    </Button>

                    {failure ? (
                        <p className={styles.failure} role="alert">
                            {failure}
                        </p>
                    ) : null}

                    {Object.keys(errors).length > 0 ? (
                        <p className={styles.failure} role="alert">
                            Some details above need another look.
                        </p>
                    ) : null}

                    <p className={styles.docketNote}>
                        Delivery in 4–7 working days. Returns within 7 days of
                        delivery — see{' '}
                        <Link className={styles.docketLink} to={ROUTES.returns}>
                            our returns policy
                        </Link>
                        .
                    </p>
                </aside>
            </form>
        </Plate>
    );
}

export default function Checkout() {
    const { user, authReady } = useCart();

    /* Wait for the auth check before deciding anything. Redirecting on a null
       user that simply hasn't loaded yet is how the previous build flashed
       logged-in admins out of pages they had every right to be on. */
    if (!authReady) {
        return (
            <Plate tone="paper" label="Order form · loading">
                <p className={styles.loading} aria-live="polite">
                    One moment…
                </p>
            </Plate>
        );
    }

    if (!user) {
        return (
            <Plate tone="paper" label="Order form · sign in">
                <div className={styles.gate}>
                    <Stamp tone="ink" solid angle={-2}>
                        Account needed
                    </Stamp>
                    <h1 className={styles.gateTitle}>Sign in to place your order</h1>
                    <p className={styles.gateBody}>
                        Orders are tied to an account so you can track them and we know
                        where to send them. Your bag is saved and will be waiting.
                    </p>
                    <div className={styles.gateActions}>
                        <Button
                            to={ROUTES.login}
                            state={{ from: ROUTES.checkout }}
                            variant="riso"
                            size="lg"
                        >
                            Sign in
                        </Button>
                        <Button
                            to={ROUTES.register}
                            state={{ from: ROUTES.checkout }}
                            variant="outline"
                            size="lg"
                        >
                            Create an account
                        </Button>
                    </div>
                </div>
            </Plate>
        );
    }

    return <CheckoutForm user={user} />;
}
