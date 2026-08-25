import { useCallback, useId, useMemo, useRef, useState } from 'react';

import Button from '../../components/primitives/Button';
import Field from '../../components/primitives/Field';
import { Icons } from '../../components/Icons';
import { useDialog } from '../../lib/useDialog';

import styles from './AdminProductForm.module.css';

/**
 * ADMIN — PRODUCT FORM.
 *
 * The old version of this file was the least safe screen in the project. Not
 * because it looked wrong, but because of what it could lose:
 *
 *  1. `onClick={onClose}` ON THE BACKDROP. One mis-click anywhere outside the
 *     panel discarded the entire form — twenty fields, no confirmation, no undo.
 *     Closing now asks, but only if something has actually been typed, and a
 *     drag that starts inside the panel and releases outside it isn't a click.
 *
 *  2. NOT ONE OF THE ~12 LABELS WAS ATTACHED TO ITS INPUT. Every one was a bare
 *     `<label>Product Name *</label>` followed by an unassociated `<input>`, so
 *     clicking a label did nothing and a screen reader announced twelve unnamed
 *     controls. The size and colour rows had no labels at all. Everything goes
 *     through `Field` now, which wires htmlFor/id, aria-describedby and
 *     aria-invalid from one place.
 *
 *  3. IT COULD ONLY EVER SET ONE IMAGE. The markup hardcoded `updateImage(0, …)`
 *     against a single URL box, while ProductDetail renders a thumbnail gallery
 *     from `images[]`. So the gallery could never have a second image. `alt` was
 *     in the state object and in the schema but had no control anywhere, which is
 *     why every product photo in the shop reaches the page with `alt: ''`.
 *
 *  4. `alert('Failed to save product: ' + error.message)`. A modal on top of a
 *     modal, which has to be dismissed before you can see the form it refers to,
 *     and which says nothing about which field the server objected to.
 *
 *  5. A PROP→STATE `useEffect` GUARDED BY `if (product)`. Opening Add straight
 *     after Edit left every one of the previous product's values in the form —
 *     because with `product` null the effect deliberately did nothing. Fixed by
 *     deleting the effect: the parent keys this component by product id, so React
 *     remounts it and the initialiser runs again. State derived from props at
 *     mount belongs in the initialiser, not in an effect that races it.
 *
 *  6. `key={index}` ON BOTH DYNAMIC LISTS, with removal by index. Delete the
 *     first of three colours and React reconciles the wrong DOM nodes: the text
 *     you typed appears to jump to another row. Rows carry their own stable key
 *     and are matched by it, never by position.
 *
 *  7. COLOURS WERE SILENTLY DROPPED. `.filter(c => c.name)` at submit meant a
 *     colour you'd picked but not named vanished with no warning. It's a
 *     validation error now — the user finds out before the save, not never.
 *
 *  8. DUPLICATE SIZES WERE SELECTABLE. Two "M" rows with different stock counts
 *     leaves the real stock for M ambiguous, and the schema can't reject it
 *     because it's a valid array of valid subdocuments. Each row's select now
 *     offers only the sizes no other row has taken.
 *
 * ON THE LIMITS: name ≤ 100 and description ≤ 2000 are enforced by
 * Product.model.js. They're shown here as live counters, because the alternative
 * is a 500 from the server with a raw Mongoose validation string in it — the
 * controller catches every error and returns "Failed to create product".
 */

/* ---------------------------------------------------------------------------
   These mirror the enums in backend/src/models/Product.model.js. A value that
   isn't in the schema's list comes back as a 500 with the message "Failed to
   create product", because the controller collapses every error into that one
   string — so drift here is expensive to diagnose.
   --------------------------------------------------------------------------- */
const CATEGORIES = [
    'jackets',
    'shirts',
    'pants',
    'caps',
    'accessories',
    'shoes',
    'hoodies',
];
const COLLECTIONS = ['edge', 'canvas', 'energy', 'limited', 'classics'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BADGES = ['new', 'bestseller', 'limited', 'sale', 'soldout'];

const NAME_MAX = 100;
const DESC_MAX = 2000;

const sentence = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const asOptions = (values) =>
    values.map((value) => ({ value, label: sentence(value) }));

const CATEGORY_OPTIONS = asOptions(CATEGORIES);
const COLLECTION_OPTIONS = asOptions(COLLECTIONS);
const BADGE_OPTIONS = [{ value: '', label: 'No badge' }, ...asOptions(BADGES)];

/* Row identity. A counter rather than an index, because index-as-key plus
   removal-by-index is what made the old rows swap their contents. Stripped
   before the payload goes to the server. */
let rowSeq = 0;
const withKey = (row) => ({ ...row, _key: `row-${(rowSeq += 1)}` });

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/* `<input type="color">` accepts only a full seven-character hex. Given anything
   else it silently shows black, so what's on screen stops matching what's in the
   field — which is why the swatch reads through this and the text box doesn't. */
function normaliseHex(value) {
    const match = String(value || '').trim().match(HEX);
    if (!match) return '#000000';
    const digits = match[1];
    const full =
        digits.length === 3
            ? digits
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : digits;
    return `#${full.toLowerCase()}`;
}

/* ---------------------------------------------------------------------------
   PROPS → STATE, once, at mount.

   Numbers use `??` rather than `||`: the old form's `product.price || ''` turned
   a price of 0 into an empty box, so opening and saving a free item silently
   asked for a required field to be re-entered.

   Every numeric field is held as a STRING. Storing `parseInt(value) || 0` on
   each keystroke, as the old form did for stock, means clearing the box snaps it
   back to 0 and typing "10" over it gives "010" — the control fights the user.
   Coercion happens once, at submit.
   --------------------------------------------------------------------------- */
function fromProduct(product) {
    const p = product || {};
    const images = Array.isArray(p.images) && p.images.length ? p.images : [{}];
    const sizes =
        Array.isArray(p.sizes) && p.sizes.length ? p.sizes : [{ size: 'M' }];
    const colors = Array.isArray(p.colors) && p.colors.length ? p.colors : [{}];

    return {
        name: p.name || '',
        description: p.description || '',
        price: p.price ?? '',
        comparePrice: p.comparePrice ?? '',
        category: p.category || 'shirts',
        collection: p.collection || 'classics',
        images: images.map((i) =>
            withKey({ url: i.url || '', alt: i.alt || '' })
        ),
        sizes: sizes.map((s) =>
            withKey({ size: s.size || 'M', stock: String(s.stock ?? 0) })
        ),
        colors: colors.map((c) =>
            withKey({ name: c.name || '', hexCode: c.hexCode || '#111111' })
        ),
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
        badge: p.badge || '',
        isFeatured: Boolean(p.isFeatured),
        isLimited: Boolean(p.isLimited),
        limitedStock: p.limitedStock ?? '',
        /* Absent means true — that's the schema default, and a new product is
           listed unless someone says otherwise. */
        isActive: p.isActive !== false,
    };
}

/* Explicit field-by-field, not `{ ...form }`. Spreading would post `_key` and
   the string versions of every number straight to Mongo. */
function toPayload(form) {
    return {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        comparePrice:
            form.comparePrice === '' ? undefined : Number(form.comparePrice),
        category: form.category,
        collection: form.collection || undefined,
        images: form.images
            .filter((i) => i.url.trim())
            .map((i) => ({ url: i.url.trim(), alt: i.alt.trim() })),
        sizes: form.sizes.map((s) => ({
            size: s.size,
            stock: Math.max(0, Number(s.stock) || 0),
        })),
        colors: form.colors
            .filter((c) => c.name.trim() || c.hexCode)
            .map((c) => ({
                name: c.name.trim(),
                hexCode: normaliseHex(c.hexCode),
            })),
        tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        /* '' is not in the badge enum; null is. */
        badge: form.badge || null,
        isFeatured: form.isFeatured,
        isLimited: form.isLimited,
        limitedStock:
            form.isLimited && form.limitedStock !== ''
                ? Number(form.limitedStock)
                : undefined,
        isActive: form.isActive,
    };
}

function validate(form) {
    const errors = {};

    if (!form.name.trim()) errors.name = 'A product needs a name.';
    else if (form.name.trim().length > NAME_MAX)
        errors.name = `Names are capped at ${NAME_MAX} characters. This one is ${
            form.name.trim().length
        }.`;

    if (!form.description.trim())
        errors.description = 'A description is required.';
    else if (form.description.trim().length > DESC_MAX)
        errors.description = `Descriptions are capped at ${DESC_MAX} characters. This one is ${
            form.description.trim().length
        }.`;

    const price = Number(form.price);
    if (form.price === '' || Number.isNaN(price))
        errors.price = 'Enter a price in rupees.';
    else if (price < 0) errors.price = 'A price can’t be negative.';

    if (form.comparePrice !== '') {
        const compare = Number(form.comparePrice);
        if (Number.isNaN(compare))
            errors.comparePrice = 'That isn’t a number.';
        else if (compare <= price)
            /* The discountPercent virtual only computes when comparePrice >
               price. Below it, the storefront strikes through a number that was
               never higher — which is a false claim about a discount. */
            errors.comparePrice =
                'The “was” price has to be higher than the price, or the shop shows a discount that doesn’t exist.';
    }

    const usableImages = form.images.filter((i) => i.url.trim());
    if (usableImages.length === 0)
        errors.images = 'At least one image URL is needed.';
    form.images.forEach((image, index) => {
        if (!image.url.trim()) return;
        if (!image.alt.trim())
            errors[`image-alt-${image._key}`] =
                `Image ${index + 1} has no alt text.`;
    });

    if (form.sizes.length === 0)
        errors.sizes =
            'Add at least one size, or the product can’t be added to a basket.';

    form.colors.forEach((color, index) => {
        if (!color.name.trim())
            errors[`color-name-${color._key}`] =
                `Colour ${index + 1} has no name.`;
        else if (!HEX.test(color.hexCode))
            errors[`color-hex-${color._key}`] =
                `Colour ${index + 1}: “${color.hexCode}” isn’t a hex value.`;
    });

    if (form.isLimited) {
        const stock = Number(form.limitedStock);
        if (form.limitedStock === '' || Number.isNaN(stock) || stock < 1)
            errors.limitedStock =
                'A limited edition needs a run size of at least 1.';
    }

    return errors;
}

export default function AdminProductForm({ product, onSave, onClose }) {
    const uid = useId();
    const titleId = `${uid}-title`;
    const formId = `${uid}-form`;

    /* Read once. There is no effect syncing props into state — the parent keys
       this component by product id, so switching records remounts it. */
    const [initial] = useState(() => fromProduct(product));
    const [form, setForm] = useState(initial);

    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [failure, setFailure] = useState('');
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);

    const summaryRef = useRef(null);

    const dirty = useMemo(
        () => JSON.stringify(form) !== JSON.stringify(initial),
        [form, initial]
    );

    /* Closing only interrupts if there's something to lose. An untouched form
       closes immediately — being asked "discard your changes?" when you made
       none is the kind of prompt people learn to dismiss without reading. */
    const requestClose = useCallback(() => {
        if (saving) return;
        if (!dirty) {
            onClose();
            return;
        }
        setConfirmingDiscard(true);
    }, [dirty, saving, onClose]);

    const { ref: dialogRef, backdropProps } = useDialog(requestClose);

    const set = useCallback((name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
        /* Clear that field's error as soon as it's touched. Leaving a stale
           message under a field the user has just corrected reads as "still
           wrong". */
        setErrors((prev) =>
            prev[name] ? { ...prev, [name]: undefined } : prev
        );
    }, []);

    const addRow = useCallback((list, blank) => {
        setForm((prev) => ({ ...prev, [list]: [...prev[list], withKey(blank)] }));
        setErrors((prev) => (prev[list] ? { ...prev, [list]: undefined } : prev));
    }, []);

    /* Matched by key. `map` by index plus `filter` by index is how the old form
       edited the row below the one you were looking at. */
    const patchRow = useCallback((list, key, patch) => {
        setForm((prev) => ({
            ...prev,
            [list]: prev[list].map((row) =>
                row._key === key ? { ...row, ...patch } : row
            ),
        }));

        /* Row errors are keyed by row, so editing a row clears its own messages
           and leaves every other row's alone — the same "don't nag about what
           they've just fixed" rule as `set`, applied to a list. */
        setErrors((prev) => {
            const stale = Object.keys(prev).filter(
                (name) => prev[name] && name.endsWith(key)
            );
            if (stale.length === 0) return prev;
            const next = { ...prev };
            stale.forEach((name) => delete next[name]);
            return next;
        });
    }, []);

    const dropRow = useCallback((list, key) => {
        setForm((prev) => ({
            ...prev,
            [list]: prev[list].filter((row) => row._key !== key),
        }));
    }, []);

    const submit = async (event) => {
        event.preventDefault();

        const found = validate(form);
        const messages = Object.values(found).filter(Boolean);

        if (messages.length > 0) {
            setErrors(found);
            setFailure('');
            /* Focus the summary, not the first bad field: on a form this long the
               user needs the shape of what's wrong before being dropped into one
               corner of it. */
            requestAnimationFrame(() => summaryRef.current?.focus());
            return;
        }

        setErrors({});
        setSaving(true);
        setFailure('');

        try {
            await onSave(toPayload(form));
            /* No setState after this point on success — the parent unmounts us. */
        } catch (err) {
            /* Shown here rather than upstream: the products page has its own
               error banner, but while this dialog is open that banner is behind
               the scrim, so an admin would see nothing at all. */
            setFailure(
                err?.message ||
                    'That didn’t save. Nothing has been changed, and everything you typed is still here.'
            );
            setSaving(false);
        }
    };

    const takenSizes = form.sizes.map((s) => s.size);
    const errorList = Object.values(errors).filter(Boolean);

    return (
        <div className={styles.overlay} {...backdropProps}>
            <div
                className={styles.dialog}
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <div className={styles.head}>
                    <div>
                        <p className={styles.eyebrow}>
                            {product ? 'Amending a plate' : 'New plate'}
                        </p>
                        <h2 className={styles.title} id={titleId}>
                            {product ? product.name : 'Add a product'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className={styles.close}
                        onClick={requestClose}
                    >
                        <Icons.X size={18} />
                        <span className="visuallyHidden">Close</span>
                    </button>
                </div>

                <form
                    className={styles.form}
                    id={formId}
                    onSubmit={submit}
                    noValidate
                >
                    {/* noValidate because the browser's own bubble appears on one
                        field at a time and pre-empts this summary. `required` is
                        still set on the controls, so it's still announced. */}
                    {errorList.length > 0 ? (
                        <div
                            className={styles.summary}
                            ref={summaryRef}
                            tabIndex={-1}
                            role="alert"
                        >
                            <p className={styles.summaryTitle}>
                                {errorList.length === 1
                                    ? 'One thing to fix'
                                    : `${errorList.length} things to fix`}
                            </p>
                            <ul className={styles.summaryList}>
                                {errorList.map((message) => (
                                    <li key={message}>{message}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {/* ---- BASICS ------------------------------------------ */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <h3 className={styles.sectionTitle}>The basics</h3>
                        </div>

                        <div className={styles.grid}>
                            <Field
                                className={styles.wide}
                                label="Product name"
                                name="name"
                                required
                                value={form.name}
                                maxLength={NAME_MAX}
                                placeholder="Urban Vanguard Tee"
                                hint={`${form.name.length} of ${NAME_MAX} characters`}
                                error={errors.name}
                                onChange={(e) => set('name', e.target.value)}
                            />

                            <Field
                                className={styles.wide}
                                as="textarea"
                                label="Description"
                                name="description"
                                required
                                rows={4}
                                value={form.description}
                                maxLength={DESC_MAX}
                                hint={`${form.description.length} of ${DESC_MAX} characters. This is the copy on the product page.`}
                                error={errors.description}
                                onChange={(e) =>
                                    set('description', e.target.value)
                                }
                            />

                            <Field
                                label="Price (₹)"
                                name="price"
                                type="number"
                                min="0"
                                step="1"
                                inputMode="numeric"
                                required
                                value={form.price}
                                placeholder="2999"
                                error={errors.price}
                                onChange={(e) => set('price', e.target.value)}
                            />

                            <Field
                                label="Was (₹)"
                                name="comparePrice"
                                type="number"
                                min="0"
                                step="1"
                                inputMode="numeric"
                                value={form.comparePrice}
                                placeholder="3999"
                                hint="Optional. Shown struck through, so it has to be higher than the price."
                                error={errors.comparePrice}
                                onChange={(e) =>
                                    set('comparePrice', e.target.value)
                                }
                            />

                            <Field
                                as="select"
                                label="Category"
                                name="category"
                                required
                                options={CATEGORY_OPTIONS}
                                value={form.category}
                                onChange={(e) => set('category', e.target.value)}
                            />

                            <Field
                                as="select"
                                label="Collection"
                                name="collection"
                                options={COLLECTION_OPTIONS}
                                value={form.collection}
                                onChange={(e) =>
                                    set('collection', e.target.value)
                                }
                            />
                        </div>
                    </section>

                    {/* ---- IMAGES ------------------------------------------ */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <h3 className={styles.sectionTitle}>Pictures</h3>
                            <button
                                type="button"
                                className={styles.addBtn}
                                onClick={() =>
                                    addRow('images', { url: '', alt: '' })
                                }
                            >
                                <Icons.Plus size={13} /> Add a picture
                            </button>
                        </div>

                        <p className={styles.sectionNote}>
                            The first one is the shopfront image — it’s what the
                            catalogue, the basket and the order confirmation all
                            use. The rest become the thumbnail gallery on the
                            product page.
                        </p>

                        {errors.images ? (
                            <p className={styles.notice} role="alert">
                                {errors.images}
                            </p>
                        ) : null}

                        <ul className={styles.rows}>
                            {form.images.map((image, index) => (
                                <li className={styles.row} key={image._key}>
                                    <div
                                        className={styles.rowFields}
                                        data-cols="2"
                                    >
                                        <Field
                                            label={`Image ${index + 1} URL`}
                                            name={`image-url-${image._key}`}
                                            type="url"
                                            value={image.url}
                                            placeholder="https://…"
                                            onChange={(e) =>
                                                patchRow(
                                                    'images',
                                                    image._key,
                                                    { url: e.target.value }
                                                )
                                            }
                                        />

                                        <Field
                                            label="Alt text"
                                            name={`image-alt-${image._key}`}
                                            value={image.alt}
                                            placeholder="Front view, worn open over a white tee"
                                            hint="What the photo shows, for anyone who can’t see it."
                                            error={
                                                errors[
                                                    `image-alt-${image._key}`
                                                ]
                                            }
                                            onChange={(e) =>
                                                patchRow(
                                                    'images',
                                                    image._key,
                                                    { alt: e.target.value }
                                                )
                                            }
                                        />
                                    </div>

                                    <div className={styles.rowAside}>
                                        {image.url.trim() ? (
                                            <img
                                                className={styles.preview}
                                                src={image.url}
                                                alt=""
                                                loading="lazy"
                                            />
                                        ) : (
                                            <span
                                                className={styles.previewMissing}
                                                aria-hidden="true"
                                            >
                                                No URL
                                            </span>
                                        )}

                                        {form.images.length > 1 ? (
                                            <button
                                                type="button"
                                                className={styles.removeBtn}
                                                onClick={() =>
                                                    dropRow('images', image._key)
                                                }
                                            >
                                                <Icons.Trash size={14} />
                                                <span className="visuallyHidden">
                                                    Remove image {index + 1}
                                                </span>
                                            </button>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* ---- SIZES ------------------------------------------- */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <h3 className={styles.sectionTitle}>
                                Sizes &amp; stock
                            </h3>
                            <button
                                type="button"
                                className={styles.addBtn}
                                disabled={form.sizes.length >= SIZES.length}
                                onClick={() => {
                                    const free = SIZES.find(
                                        (s) => !takenSizes.includes(s)
                                    );
                                    if (free) addRow('sizes', { size: free, stock: '0' });
                                }}
                            >
                                <Icons.Plus size={13} />{' '}
                                {form.sizes.length >= SIZES.length
                                    ? 'All sizes listed'
                                    : 'Add a size'}
                            </button>
                        </div>

                        <p className={styles.sectionNote}>
                            A size with 0 stock still appears on the product page,
                            marked unavailable. Remove the row to hide it
                            entirely.
                        </p>

                        {errors.sizes ? (
                            <p className={styles.notice} role="alert">
                                {errors.sizes}
                            </p>
                        ) : null}

                        <ul className={styles.rows}>
                            {form.sizes.map((row, index) => (
                                <li className={styles.row} key={row._key}>
                                    <div
                                        className={styles.rowFields}
                                        data-cols="2"
                                    >
                                        {/* Only the sizes no other row has taken.
                                            Two rows for M would make the stock
                                            for M ambiguous, and the schema can't
                                            reject it. */}
                                        <Field
                                            as="select"
                                            label={`Size ${index + 1}`}
                                            name={`size-${row._key}`}
                                            options={SIZES.filter(
                                                (s) =>
                                                    s === row.size ||
                                                    !takenSizes.includes(s)
                                            )}
                                            value={row.size}
                                            onChange={(e) =>
                                                patchRow('sizes', row._key, {
                                                    size: e.target.value,
                                                })
                                            }
                                        />

                                        <Field
                                            label={`Stock for ${row.size}`}
                                            name={`stock-${row._key}`}
                                            type="number"
                                            min="0"
                                            step="1"
                                            inputMode="numeric"
                                            value={row.stock}
                                            onChange={(e) =>
                                                patchRow('sizes', row._key, {
                                                    stock: e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={() => dropRow('sizes', row._key)}
                                    >
                                        <Icons.Trash size={14} />
                                        <span className="visuallyHidden">
                                            Remove size {row.size}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* ---- COLOURS ---------------------------------------- */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <h3 className={styles.sectionTitle}>Colours</h3>
                            <button
                                type="button"
                                className={styles.addBtn}
                                onClick={() =>
                                    addRow('colors', {
                                        name: '',
                                        hexCode: '#111111',
                                    })
                                }
                            >
                                <Icons.Plus size={13} /> Add a colour
                            </button>
                        </div>

                        <p className={styles.sectionNote}>
                            The name is the part that matters — it’s the only
                            thing a screen reader can announce, and the only thing
                            on the order that tells you which one to pick off the
                            shelf.
                        </p>

                        <ul className={styles.rows}>
                            {form.colors.map((color, index) => (
                                <li className={styles.row} key={color._key}>
                                    <div
                                        className={styles.rowFields}
                                        data-cols="3"
                                    >
                                        {/* Reads through normaliseHex so the well
                                            never disagrees with the text box. */}
                                        <input
                                            type="color"
                                            className={styles.swatch}
                                            aria-label={`Colour picker for colour ${
                                                index + 1
                                            }`}
                                            value={normaliseHex(color.hexCode)}
                                            onChange={(e) =>
                                                patchRow('colors', color._key, {
                                                    hexCode: e.target.value,
                                                })
                                            }
                                        />

                                        <Field
                                            label="Hex"
                                            name={`hex-${color._key}`}
                                            value={color.hexCode}
                                            placeholder="#111111"
                                            error={
                                                errors[`color-hex-${color._key}`]
                                            }
                                            onChange={(e) =>
                                                patchRow('colors', color._key, {
                                                    hexCode: e.target.value,
                                                })
                                            }
                                        />

                                        <Field
                                            label="Colour name"
                                            name={`color-name-${color._key}`}
                                            value={color.name}
                                            placeholder="Washed black"
                                            error={
                                                errors[
                                                    `color-name-${color._key}`
                                                ]
                                            }
                                            onChange={(e) =>
                                                patchRow('colors', color._key, {
                                                    name: e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={() =>
                                            dropRow('colors', color._key)
                                        }
                                    >
                                        <Icons.Trash size={14} />
                                        <span className="visuallyHidden">
                                            Remove colour {index + 1}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* ---- LISTING ---------------------------------------- */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <h3 className={styles.sectionTitle}>
                                How it’s listed
                            </h3>
                        </div>

                        <div className={styles.grid}>
                            <Field
                                as="select"
                                label="Badge"
                                name="badge"
                                options={BADGE_OPTIONS}
                                value={form.badge}
                                hint="The corner flag on the product card."
                                onChange={(e) => set('badge', e.target.value)}
                            />

                            <Field
                                label="Tags"
                                name="tags"
                                value={form.tags}
                                placeholder="streetwear, oversized, monsoon"
                                hint="Comma separated. Searchable."
                                onChange={(e) => set('tags', e.target.value)}
                            />

                            <div className={`${styles.checks} ${styles.wide}`}>
                                <label className={styles.check}>
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={(e) =>
                                            set('isActive', e.target.checked)
                                        }
                                    />
                                    <span>
                                        Listed in the shop
                                        <span className={styles.checkNote}>
                                            Unlisting hides it from the
                                            storefront. Note that it also hides it
                                            from this admin list, which only
                                            fetches listed products — so relisting
                                            it later isn’t possible from here yet.
                                        </span>
                                    </span>
                                </label>

                                <label className={styles.check}>
                                    <input
                                        type="checkbox"
                                        checked={form.isFeatured}
                                        onChange={(e) =>
                                            set('isFeatured', e.target.checked)
                                        }
                                    />
                                    <span>
                                        Featured
                                        <span className={styles.checkNote}>
                                            Appears in the homepage picks.
                                        </span>
                                    </span>
                                </label>

                                <label className={styles.check}>
                                    <input
                                        type="checkbox"
                                        checked={form.isLimited}
                                        onChange={(e) =>
                                            set('isLimited', e.target.checked)
                                        }
                                    />
                                    <span>
                                        Limited edition
                                        <span className={styles.checkNote}>
                                            Appears in the limited drop section,
                                            with a run size.
                                        </span>
                                    </span>
                                </label>
                            </div>

                            {/* Only asked for when it applies. A run-size box
                                that's permanently visible but usually irrelevant
                                gets filled in by accident. */}
                            {form.isLimited ? (
                                <Field
                                    label="Run size"
                                    name="limitedStock"
                                    type="number"
                                    min="1"
                                    step="1"
                                    inputMode="numeric"
                                    required
                                    value={form.limitedStock}
                                    placeholder="120"
                                    hint="How many exist in total."
                                    error={errors.limitedStock}
                                    onChange={(e) =>
                                        set('limitedStock', e.target.value)
                                    }
                                />
                            ) : null}
                        </div>
                    </section>
                </form>

                <div className={styles.foot}>
                    {failure ? (
                        <p className={styles.failure} role="alert">
                            {failure}
                        </p>
                    ) : null}

                    {confirmingDiscard ? (
                        <>
                            <p className={styles.discard}>
                                Close without saving? What you’ve typed will be
                                lost.
                            </p>
                            <Button
                                variant="quiet"
                                size="md"
                                onClick={() => setConfirmingDiscard(false)}
                            >
                                Keep editing
                            </Button>
                            <Button variant="danger" size="md" onClick={onClose}>
                                Discard
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="quiet"
                                size="md"
                                onClick={requestClose}
                            >
                                Cancel
                            </Button>
                            {/* Outside the <form> so it can stay pinned to the
                                footer while the form itself scrolls — and tied
                                back to it by the `form` attribute, so Enter
                                inside a field and a click here go through the
                                same submit handler. */}
                            <Button
                                variant="riso"
                                size="md"
                                type="submit"
                                form={formId}
                                loading={saving}
                            >
                                {product ? 'Save changes' : 'Create product'}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
