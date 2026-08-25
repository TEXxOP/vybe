import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Plate from '../components/primitives/Plate';
import Stamp from '../components/primitives/Stamp';
import Ink from '../components/primitives/Ink';
import Button from '../components/primitives/Button';
import Reveal from '../components/primitives/Reveal';
import { Icons } from '../components/Icons';

import { productsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { money, discountPercent } from '../lib/format';
import { FREE_SHIPPING_THRESHOLD, MAX_PER_LINE } from '../lib/cart';
import { productEnquiryHref, COMMERCE_ENABLED } from '../lib/enquiry';
import { ROUTES, shopCategory } from '../lib/routes';
import styles from './ProductDetail.module.css';

/**
 * Product detail — one garment, presented as a printed plate.
 *
 * This page carried the most defects in the build, and two of them were single
 * wrong words:
 *
 *  1. `product.originalPrice` DOES NOT EXIST. The schema field is
 *     `comparePrice`. The entire discount block was therefore unreachable —
 *     nothing on this site has ever appeared to be on sale.
 *
 *  2. `c.hex` DOES NOT EXIST either; the schema field is `hexCode`. Every
 *     colour swatch was `background: undefined`, so all of them rendered
 *     identically and the colour picker was impossible to use.
 *
 *  3. A PRODUCT WITH NO COLOURS COULD NEVER BE ADDED TO THE CART. The guard
 *     required `selectedSize && selectedColor`, and selectedColor was only ever
 *     set from `colors[0]`. Colour is now required only when the product
 *     actually has colours.
 *
 *  4. FIVE STARS WERE INVENTED. `Math.round(rating || 5)` gave an unrated
 *     product five stars — and printed "(0 reviews)" on the same line. It also
 *     rendered *only* filled stars, so a 2-star product showed two stars with
 *     nothing to compare against, reading as full marks.
 *
 *  5. QUANTITY WAS UNBOUNDED. You could order 40 of something with 3 in stock.
 *     It is now capped by the stock of the selected size, and the cap is
 *     visible rather than silent.
 *
 *  6. STALE STATE SURVIVED NAVIGATION. Going from a product with four images
 *     (on image 4) to one with a single image left currentImage at 3, so the
 *     main image resolved to undefined and broke. Same class of bug for size,
 *     colour and quantity. Fixed structurally: the inner view is keyed by id,
 *     so every selection resets when the route changes.
 *
 *  7. `addToCart` WAS NOT AWAITED. It is async and rethrows on failure, so a
 *     server error produced an unhandled rejection while the button
 *     cheerfully said "Added to Cart".
 *
 *  8. THE WISHLIST BUTTON HAD NO HANDLER. There is no wishlist endpoint, so
 *     it is gone rather than decorative.
 *
 *  9. `alert('Please select size and color')` fired even when a size was
 *     selected. Validation is now inline, specific, and attached to the
 *     control it concerns.
 *
 * The free-delivery promise reads FREE_SHIPPING_THRESHOLD from lib/cart, the
 * same constant the checkout charges against. It was hardcoded as ₹999 here
 * and computed separately there — two numbers that could silently disagree.
 */

/* Rating out of five, honestly: five glyphs, only the earned ones filled. */
function Rating({ average, count }) {
    if (!Number(count)) {
        return (
            <p className={styles.unrated}>
                Not yet rated —{' '}
                <span className={styles.unratedHint}>be the first to wear it</span>
            </p>
        );
    }

    const value = Number(average) || 0;
    const rounded = Math.round(value);

    return (
        <p className={styles.rating}>
            <span className={styles.stars} aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                    <Icons.Star key={n} size={14} filled={n <= rounded} />
                ))}
            </span>
            <span className={styles.ratingValue}>{value.toFixed(1)}</span>
            <span className={styles.ratingCount}>
                {count} {count === 1 ? 'rating' : 'ratings'}
            </span>
            <span className="visuallyHidden">
                {value.toFixed(1)} out of 5, from {count}{' '}
                {count === 1 ? 'rating' : 'ratings'}
            </span>
        </p>
    );
}

function RelatedRail({ category, exceptId }) {
    const [items, setItems] = useState([]);

    useEffect(() => {
        if (!category) return undefined;

        const ac = new AbortController();
        productsAPI
            .getAll({ category, limit: 4 }, { signal: ac.signal })
            .then((data) =>
                setItems(
                    (data.products || [])
                        .filter((p) => p._id !== exceptId)
                        .slice(0, 3)
                )
            )
            // A secondary rail. If it fails, the page is still complete —
            // showing an error here would be louder than the feature is worth.
            .catch(() => {});

        return () => ac.abort();
    }, [category, exceptId]);

    /* The whole plate lives inside this guard, not around it. Returning null
       from a child that a parent has already wrapped in a bordered, labelled
       Plate leaves an empty frame on screen for any product with no
       neighbours. */
    if (items.length === 0) return null;

    return (
        <Reveal as="div">
            <Plate tone="raised" label="Plate · neighbours">
                <h2 className={styles.relatedHead}>Also in this run</h2>

                <ul className={styles.relatedList}>
                    {items.map((item, i) => (
                        <li key={item._id}>
                            <Link
                                className={styles.relatedCard}
                                to={ROUTES.product(item._id)}
                            >
                                <Ink
                                    src={item.images?.[0]?.url || ''}
                                    alt={item.images?.[0]?.alt || item.name}
                                    ratio="4 / 5"
                                    plate={['pink', 'orange', 'blue'][i % 3]}
                                    sizes="(min-width: 900px) 22vw, 45vw"
                                />
                                <span className={styles.relatedName}>{item.name}</span>
                                <span className={styles.relatedPrice}>
                                    {money(item.price)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </Plate>
        </Reveal>
    );
}

function ProductView({ id }) {
    const { addToCart } = useCart();

    const [state, setState] = useState({ status: 'loading' });

    /* null means "the customer hasn't chosen yet", which is different from
       "there is nothing to choose". The effective values are derived during
       render, so there is no effect writing selection state — that pattern is
       what made the previous version carry stale selections across routes. */
    const [pickedSize, setPickedSize] = useState(null);
    const [pickedColor, setPickedColor] = useState(null);
    const [wanted, setWanted] = useState(1);
    const [imageIndex, setImageIndex] = useState(0);

    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        const ac = new AbortController();

        productsAPI
            .getById(id, { signal: ac.signal })
            .then((data) => {
                if (!data?.product) {
                    setState({ status: 'missing' });
                    return;
                }
                setState({ status: 'ready', product: data.product });
            })
            .catch((err) => {
                if (err?.name === 'AbortError') return;
                setState({
                    // A 404 is a different message from a dead server, and the
                    // old code showed "Product not found" for both.
                    status: err?.status === 404 ? 'missing' : 'error',
                    message: err?.message,
                });
            });

        return () => ac.abort();
    }, [id]);

    /* The confirmation badge clears itself. The previous setTimeout had no
       cleanup, so leaving the page mid-countdown set state after unmount. */
    useEffect(() => {
        if (!added) return undefined;
        const t = setTimeout(() => setAdded(false), 2600);
        return () => clearTimeout(t);
    }, [added]);

    if (state.status === 'loading') {
        return (
            <Plate tone="paper" label="Plate · loading">
                <div className={styles.skeleton} aria-live="polite">
                    <p className={styles.skeletonNote}>Inking the plate…</p>
                    <div className={styles.skeletonGrid}>
                        <div className={styles.skeletonImage} />
                        <div className={styles.skeletonCol}>
                            <div className={styles.skeletonLine} />
                            <div className={styles.skeletonLineShort} />
                            <div className={styles.skeletonBlock} />
                        </div>
                    </div>
                </div>
            </Plate>
        );
    }

    if (state.status !== 'ready') {
        const missing = state.status === 'missing';
        return (
            <Plate tone="paper" label="Plate · not on press">
                <div className={styles.notice}>
                    <Stamp tone={missing ? 'muted' : 'danger'} solid angle={-2}>
                        {missing ? 'Out of print' : 'Press jam'}
                    </Stamp>
                    <h1 className={styles.noticeTitle}>
                        {missing
                            ? 'This plate is out of print'
                            : "This plate didn't come off the press"}
                    </h1>
                    <p className={styles.noticeBody}>
                        {missing
                            ? 'The garment you asked for is no longer in the catalogue. It may have been a limited run that sold through.'
                            : state.message ||
                              'Something went wrong on the way to the server.'}
                    </p>
                    <Button to={ROUTES.shop} variant="ink" size="lg">
                        Back to the catalogue
                    </Button>
                </div>
            </Plate>
        );
    }

    const product = state.product;
    const images = Array.isArray(product.images) ? product.images : [];
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const colors = Array.isArray(product.colors) ? product.colors : [];

    const inStock = sizes.filter((s) => Number(s.stock) > 0);
    const anyStock = sizes.length === 0 || inStock.length > 0;

    /* Default to the first size that can actually be bought, not sizes[0] —
       which was frequently the sold-out XS. */
    const size = pickedSize ?? inStock[0]?.size ?? null;
    const color = pickedColor ?? colors[0]?.name ?? null;
    const needsColor = colors.length > 0;

    const sizeStock = Number(sizes.find((s) => s.size === size)?.stock);
    /* Real stock wins where it's known; MAX_PER_LINE is the backstop. Both
       numbers live in lib/cart so the cart can't disagree with this page. */
    const cap = Number.isFinite(sizeStock) && sizeStock > 0
        ? Math.min(sizeStock, MAX_PER_LINE)
        : sizes.length === 0
          ? MAX_PER_LINE
          : 0;
    /* Clamped on the way out rather than corrected in an effect, so switching
       from a size with 8 in stock to one with 2 can't leave a stale 8. */
    const qty = Math.max(1, Math.min(wanted, Math.max(cap, 1)));

    const off = discountPercent(product.price, product.comparePrice);
    const image = images[Math.min(imageIndex, Math.max(images.length - 1, 0))];

    const onAdd = async () => {
        if (sizes.length > 0 && !size) {
            setFormError('Choose a size first.');
            return;
        }
        if (needsColor && !color) {
            setFormError('Choose a colour first.');
            return;
        }

        setFormError('');
        setBusy(true);
        try {
            await addToCart(product, qty, size || undefined, color || undefined);
            setAdded(true);
        } catch (err) {
            setFormError(
                err?.message || 'Could not add this to your bag. Please try again.'
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Plate tone="paper" label={`Plate · ${product.category}`}>
                {/* Real links. The old "Back" called navigate(-1), which walks
                    off the site entirely when the page was opened from a
                    shared link. */}
                <nav className={styles.crumbs} aria-label="Breadcrumb">
                    <Link className={styles.crumb} to={ROUTES.shop}>
                        Catalogue
                    </Link>
                    <span className={styles.crumbSep} aria-hidden="true">/</span>
                    <Link className={styles.crumb} to={shopCategory(product.category)}>
                        {product.category}
                    </Link>
                    <span className={styles.crumbSep} aria-hidden="true">/</span>
                    <span className={styles.crumbHere} aria-current="page">
                        {product.name}
                    </span>
                </nav>

                <div className={styles.spread}>
                    {/* ---- IMAGES ---- */}
                    <div className={styles.plates}>
                        <Ink
                            src={image?.url || ''}
                            alt={image?.alt || product.name}
                            ratio="4 / 5"
                            plate="pink"
                            priority
                            taped
                            sizes="(min-width: 900px) 46vw, 92vw"
                        />

                        {images.length > 1 ? (
                            <div
                                className={styles.thumbs}
                                role="group"
                                aria-label="Choose a view"
                            >
                                {images.map((img, i) => (
                                    <button
                                        key={img.url || i}
                                        type="button"
                                        className={styles.thumb}
                                        data-on={i === imageIndex ? 'true' : 'false'}
                                        aria-pressed={i === imageIndex}
                                        onClick={() => setImageIndex(i)}
                                    >
                                        <img
                                            src={img.url}
                                            alt={`${product.name}, view ${i + 1}`}
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {/* ---- SPEC COLUMN ---- */}
                    <div className={styles.spec}>
                        <div className={styles.specHead}>
                            <p className={styles.eyebrow}>
                                {product.collection
                                    ? `${product.collection} collection`
                                    : product.category}
                            </p>

                            <h1 className={styles.title}>{product.name}</h1>

                            <Rating
                                average={product.rating?.average}
                                count={product.rating?.count}
                            />

                            {product.isLimited ? (
                                <Stamp tone="pink" solid angle={-2} className={styles.limited}>
                                    Limited run
                                    {Number.isFinite(product.limitedStock)
                                        ? ` · ${product.limitedStock} pressed`
                                        : ''}
                                </Stamp>
                            ) : null}
                        </div>

                        <p className={styles.priceRow}>
                            <span className={styles.price}>{money(product.price)}</span>
                            {off > 0 ? (
                                <>
                                    <s className={styles.was}>
                                        {money(product.comparePrice)}
                                    </s>
                                    <Stamp tone="pink" solid angle={3}>
                                        {off}% off
                                    </Stamp>
                                </>
                            ) : null}
                        </p>

                        {product.description
                            ? product.description
                                  .split(/\n{2,}/)
                                  .map((para, i) => (
                                      <p className={styles.description} key={i}>
                                          {para}
                                      </p>
                                  ))
                            : null}

                        {/* ---- SIZE ---- */}
                        {sizes.length > 0 ? (
                            <div className={styles.option}>
                                <div className={styles.optionHead}>
                                    <h2 className={styles.optionLabel}>Size</h2>
                                    <Link className={styles.optionAside} to={ROUTES.sizeGuide}>
                                        Size guide
                                    </Link>
                                </div>

                                <div
                                    className={styles.swatches}
                                    role="group"
                                    aria-label="Choose a size"
                                >
                                    {sizes.map((s) => {
                                        const out = !(Number(s.stock) > 0);
                                        return (
                                            <button
                                                key={s.size}
                                                type="button"
                                                className={styles.sizeBtn}
                                                data-on={s.size === size ? 'true' : 'false'}
                                                aria-pressed={s.size === size}
                                                disabled={out}
                                                aria-label={
                                                    out
                                                        ? `Size ${s.size}, sold out`
                                                        : `Size ${s.size}`
                                                }
                                                onClick={() => {
                                                    setPickedSize(s.size);
                                                    setFormError('');
                                                }}
                                            >
                                                {s.size}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Scarcity, only when it is true and specific. */}
                                {Number.isFinite(sizeStock) && sizeStock > 0 && sizeStock <= 5 ? (
                                    <p className={styles.scarcity}>
                                        Only {sizeStock} left in {size}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {/* ---- COLOUR ---- */}
                        {needsColor ? (
                            <div className={styles.option}>
                                <div className={styles.optionHead}>
                                    <h2 className={styles.optionLabel}>Colour</h2>
                                    <span className={styles.optionAside}>{color}</span>
                                </div>

                                <div
                                    className={styles.swatches}
                                    role="group"
                                    aria-label="Choose a colour"
                                >
                                    {colors.map((c) => (
                                        <button
                                            key={c.name}
                                            type="button"
                                            className={styles.colorBtn}
                                            data-on={c.name === color ? 'true' : 'false'}
                                            aria-pressed={c.name === color}
                                            aria-label={c.name}
                                            /* hexCode, not hex — the old name
                                               left every swatch transparent. */
                                            style={{ '--swatch': c.hexCode || 'transparent' }}
                                            onClick={() => {
                                                setPickedColor(c.name);
                                                setFormError('');
                                            }}
                                        >
                                            <span className={styles.colorChip} aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* ---- QUANTITY ---- */}
                        {anyStock ? (
                            <div className={styles.option}>
                                <div className={styles.optionHead}>
                                    <h2 className={styles.optionLabel}>Quantity</h2>
                                    {cap > 0 && cap < MAX_PER_LINE ? (
                                        <span className={styles.optionAside}>
                                            max {cap}
                                        </span>
                                    ) : null}
                                </div>

                                <div className={styles.stepper}>
                                    <button
                                        type="button"
                                        className={styles.stepBtn}
                                        onClick={() => setWanted(Math.max(1, qty - 1))}
                                        disabled={qty <= 1}
                                        aria-label="Decrease quantity"
                                    >
                                        <Icons.Minus size={15} />
                                    </button>

                                    <output className={styles.stepValue}>{qty}</output>

                                    <button
                                        type="button"
                                        className={styles.stepBtn}
                                        onClick={() => setWanted(Math.min(cap, qty + 1))}
                                        disabled={qty >= cap}
                                        aria-label="Increase quantity"
                                    >
                                        <Icons.Plus size={15} />
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {/* ---- ACTION ----
                            Enquiry is the primary action now. When
                            COMMERCE_ENABLED is false the WhatsApp button is the
                            only one shown, because offering "Add to bag" beside
                            it would promise a checkout that cannot complete.
                            Flip the flag and the original add-to-bag returns
                            with the enquiry demoted to a secondary option. */}
                        <div className={styles.actions}>
                            {anyStock ? (
                                <>
                                    <Button
                                        href={productEnquiryHref(product, {
                                            size,
                                            color,
                                            qty,
                                        })}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="riso"
                                        size="lg"
                                        full
                                    >
                                        <Icons.BrandWhatsApp size={17} /> Enquire ·{' '}
                                        {money(product.price * qty)}
                                    </Button>

                                    {COMMERCE_ENABLED ? (
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            full
                                            loading={busy}
                                            onClick={onAdd}
                                        >
                                            {added ? (
                                                <>
                                                    <Icons.Check size={17} /> In your
                                                    bag
                                                </>
                                            ) : (
                                                <>
                                                    <Icons.ShoppingBag size={17} /> Add
                                                    to bag
                                                </>
                                            )}
                                        </Button>
                                    ) : null}
                                </>
                            ) : (
                                <div className={styles.soldOutBox}>
                                    <Stamp tone="muted" solid angle={-1}>
                                        Sold through
                                    </Stamp>
                                    <p className={styles.soldOutNote}>
                                        Every size of this one has gone. New plates go on
                                        press every Friday at 8pm.
                                    </p>
                                    <Button to={ROUTES.shop} variant="outline">
                                        See what&apos;s still in print
                                    </Button>
                                </div>
                            )}

                            {/* Inline and specific, replacing alert(). role=alert
                                so it is announced the moment it appears. */}
                            {formError ? (
                                <p className={styles.formError} role="alert">
                                    {formError}
                                </p>
                            ) : null}

                            {added ? (
                                <p className={styles.addedRow}>
                                    <Link className={styles.addedLink} to={ROUTES.cart}>
                                        Go to your bag <Icons.ArrowRight size={13} />
                                    </Link>
                                </p>
                            ) : null}
                        </div>

                        {/* ---- PROMISES ---- */}
                        <ul className={styles.promises}>
                            <li className={styles.promise}>
                                <Icons.Truck size={17} />
                                {/* Same constant the checkout charges against. */}
                                Free delivery from {money(FREE_SHIPPING_THRESHOLD)}
                            </li>
                            <li className={styles.promise}>
                                <Icons.RefreshCw size={17} />
                                <Link className={styles.promiseLink} to={ROUTES.returns}>
                                    7-day returns
                                </Link>
                            </li>
                            <li className={styles.promise}>
                                <Icons.Shield size={17} />
                                Printed and packed by us
                            </li>
                        </ul>
                    </div>
                </div>
            </Plate>

            <RelatedRail category={product.category} exceptId={product._id} />
        </>
    );
}

export default function ProductDetail() {
    const { id } = useParams();

    /* Keyed remount per id. This is the whole fix for stale selections
       surviving a route change — image index, size, colour and quantity all
       reset because the component is genuinely new, rather than being reset by
       hand in an effect that someone will forget to update. */
    return <ProductView key={id} id={id} />;
}
