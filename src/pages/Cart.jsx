import { useState } from 'react';
import { Link } from 'react-router-dom';

import Plate from '../components/primitives/Plate';
import Stamp from '../components/primitives/Stamp';
import Button from '../components/primitives/Button';
import { Icons } from '../components/Icons';

import { useCart } from '../context/CartContext';
import { money } from '../lib/format';
import { computeTotals, FREE_SHIPPING_THRESHOLD, MAX_PER_LINE } from '../lib/cart';
import { ROUTES } from '../lib/routes';
import styles from './Cart.module.css';

/**
 * The bag — a press docket.
 *
 * Faults in the version this replaces:
 *
 *  1. `formatPrice` CALLED `.toLocaleString()` ON A POSSIBLY-UNDEFINED PRICE.
 *     One line item missing a price and the whole page threw, showing a blank
 *     screen instead of a cart. `money()` handles the gap.
 *
 *  2. THE MONEY MATHS WAS COPY-PASTED HERE FOR A THIRD TIME — literal 999, 99
 *     and 0.18, independent of the same three numbers in the checkout and in
 *     the product page's delivery promise. Four places to edit, one of which
 *     someone would inevitably miss. It now calls computeTotals().
 *
 *  3. "ADD ₹X MORE FOR FREE SHIPPING" USED A HARDCODED 999 — so the nudge and
 *     the actual threshold were free to drift apart.
 *
 *  4. "YOUR CART IS EMPTY" FLASHED ON EVERY REFRESH while logged in, because
 *     the empty check ran before the server cart had arrived. An empty cart and
 *     an unfetched cart are now different states.
 *
 *  5. "COLOR: undefined" — size and colour were printed unconditionally, and
 *     plenty of products have neither.
 *
 *  6. THE "+" BUTTON WAS UNBOUNDED. You could put 400 hoodies in the bag.
 *
 *  7. QUANTITY AND REMOVE WERE FIRE-AND-FORGET. Both are async; neither was
 *     awaited. A server refusal produced an unhandled rejection and a screen
 *     that carried on showing the old number.
 *
 *  8. THE REMOVE BUTTON WAS AN UNLABELLED ICON — announced as just "button" to
 *     a screen reader, with no indication of what it removes.
 *
 *  9. PRODUCT NAMES WEREN'T LINKS, so the bag was a dead end: nothing led back
 *     to the garment.
 *
 * 10. "Proceed to Checkout" WAS A <button onClick={navigate}> — not
 *     middle-clickable, not openable in a new tab, invisible to anything that
 *     reads links.
 *
 * 11. A DEAD via.placeholder.com URL as the image fallback — an external
 *     request that fails, so the alt text was the real fallback anyway.
 */

function Line({ item, index, busy, onQuantity, onRemove }) {
    const product = item.product || {};
    const image = product.images?.[0];
    const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
    const qty = Number(item.quantity) || 1;

    return (
        <li className={styles.line} data-busy={busy ? 'true' : 'false'}>
            <span className={styles.lineNo} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
            </span>

            <div className={styles.thumb}>
                {image?.url ? (
                    <img
                        src={image.url}
                        alt={image.alt || product.name || ''}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    /* No external placeholder service. If there is no image,
                       the frame stays empty and the name carries the line. */
                    <span className={styles.thumbEmpty} aria-hidden="true">
                        <Icons.Package size={20} />
                    </span>
                )}
            </div>

            <div className={styles.lineBody}>
                {product._id ? (
                    <Link className={styles.lineName} to={ROUTES.product(product._id)}>
                        {product.name || 'Item'}
                    </Link>
                ) : (
                    <span className={styles.lineName}>{product.name || 'Item'}</span>
                )}

                {/* Only printed when they exist. */}
                {item.size || item.color ? (
                    <p className={styles.lineMeta}>
                        {item.size ? <span>Size {item.size}</span> : null}
                        {item.size && item.color ? (
                            <span className={styles.metaSep} aria-hidden="true">
                                ·
                            </span>
                        ) : null}
                        {item.color ? <span>{item.color}</span> : null}
                    </p>
                ) : null}

                <p className={styles.lineUnit}>{money(item.price)} each</p>
            </div>

            <div className={styles.lineQty}>
                <div className={styles.stepper}>
                    <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => onQuantity(qty - 1)}
                        disabled={busy || qty <= 1}
                        aria-label={`Reduce quantity of ${product.name || 'this item'}`}
                    >
                        <Icons.Minus size={14} />
                    </button>

                    <output className={styles.stepValue}>{qty}</output>

                    <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => onQuantity(qty + 1)}
                        disabled={busy || qty >= MAX_PER_LINE}
                        aria-label={`Increase quantity of ${product.name || 'this item'}`}
                    >
                        <Icons.Plus size={14} />
                    </button>
                </div>
            </div>

            <p className={styles.lineTotal}>{money(lineTotal)}</p>

            <button
                type="button"
                className={styles.remove}
                onClick={onRemove}
                disabled={busy}
                aria-label={`Remove ${product.name || 'this item'} from your bag`}
            >
                <Icons.Trash size={15} />
            </button>
        </li>
    );
}

export default function Cart() {
    const { cart, updateQuantity, removeFromCart, cartLoading } = useCart();

    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState('');

    const items = Array.isArray(cart?.items) ? cart.items : [];

    /* One shared wrapper: mark the line busy, clear the last error, report a
       new one if the server refuses. Both mutations now rethrow, so this
       actually catches something. */
    const mutate = async (id, run) => {
        setBusyId(id);
        setError('');
        try {
            await run();
        } catch (err) {
            setError(
                err?.message || 'That change did not go through. Please try again.'
            );
        } finally {
            setBusyId(null);
        }
    };

    /* An unfetched cart is not an empty cart. Distinguishing them is what stops
       "Your bag is empty" flashing at a logged-in customer on every refresh. */
    if (cartLoading && items.length === 0) {
        return (
            <Plate tone="paper" label="Docket · loading">
                <p className={styles.loading} aria-live="polite">
                    Fetching your bag…
                </p>
            </Plate>
        );
    }

    if (items.length === 0) {
        return (
            <Plate tone="paper" label="Docket · empty">
                <div className={styles.empty}>
                    <Stamp tone="muted" solid angle={-2}>
                        Nothing on the docket
                    </Stamp>
                    {/* An h1, because this is the page's only heading. The old
                        empty state opened at h2 with no h1 above it. */}
                    <h1 className={styles.emptyTitle}>Your bag is empty</h1>
                    <p className={styles.emptyBody}>
                        Nothing has been pressed to this order yet. The catalogue is
                        where the plates live.
                    </p>
                    <Button to={ROUTES.shop} variant="riso" size="lg">
                        Open the catalogue <Icons.ArrowRight size={16} />
                    </Button>
                </div>
            </Plate>
        );
    }

    const totals = computeTotals(cart.totalPrice || 0);
    const count = cart.totalItems || items.length;
    const progress = Math.min(
        100,
        Math.round(((totals.subtotal || 0) / FREE_SHIPPING_THRESHOLD) * 100)
    );

    return (
        <Plate tone="paper" label="Docket · your bag">
            <header className={styles.masthead}>
                <p className={styles.eyebrow}>Order docket</p>
                <h1 className={styles.title}>Your bag</h1>
                <p className={styles.count}>
                    {count} {count === 1 ? 'item' : 'items'} ·{' '}
                    {items.length} {items.length === 1 ? 'line' : 'lines'}
                </p>
            </header>

            <div className={styles.layout}>
                {/* ---- LINES ---- */}
                <section className={styles.linesWrap} aria-label="Items in your bag">
                    <div className={styles.colHead} aria-hidden="true">
                        <span>Item</span>
                        <span>Qty</span>
                        <span>Amount</span>
                    </div>

                    <ul className={styles.lines}>
                        {items.map((item, i) => (
                            <Line
                                key={item._id}
                                item={item}
                                index={i}
                                busy={busyId === item._id}
                                onQuantity={(next) =>
                                    mutate(item._id, () =>
                                        updateQuantity(item._id, next)
                                    )
                                }
                                onRemove={() =>
                                    mutate(item._id, () => removeFromCart(item._id))
                                }
                            />
                        ))}
                    </ul>

                    {error ? (
                        <p className={styles.error} role="alert">
                            {error}
                        </p>
                    ) : null}

                    <Link className={styles.keepShopping} to={ROUTES.shop}>
                        <Icons.ArrowLeft size={14} /> Keep looking
                    </Link>
                </section>

                {/* ---- SUMMARY ---- */}
                <aside className={styles.summary} aria-labelledby="summary-head">
                    <h2 className={styles.summaryHead} id="summary-head">
                        Totals
                    </h2>

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

                    {/* A progress bar that measures something real, against the
                        same constant the delivery charge is computed from. */}
                    {totals.freeShipping ? (
                        <p className={styles.shipNote}>
                            <Icons.Truck size={15} /> Delivery is on us.
                        </p>
                    ) : (
                        <div className={styles.shipProgress}>
                            <p className={styles.shipNote}>
                                <Icons.Truck size={15} />{' '}
                                {money(totals.amountToFreeShipping)} more for free
                                delivery
                            </p>
                            <div
                                className={styles.bar}
                                style={{ '--fill': `${progress}%` }}
                                role="progressbar"
                                aria-valuenow={progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Progress towards free delivery"
                            >
                                <span className={styles.barFill} />
                            </div>
                        </div>
                    )}

                    {/* A real link: middle-clickable, and announced as a link. */}
                    <Button to={ROUTES.checkout} variant="riso" size="lg" full>
                        <Icons.Lock size={16} /> Checkout · {money(totals.total)}
                    </Button>

                    <ul className={styles.pay}>
                        <li>
                            <Icons.CreditCard size={15} /> Card
                        </li>
                        <li>
                            <Icons.Smartphone size={15} /> UPI
                        </li>
                        <li>
                            <Icons.Cash size={15} /> Cash on delivery
                        </li>
                    </ul>
                </aside>
            </div>
        </Plate>
    );
}
