import { useCallback, useState } from 'react';

import Button from '../../components/primitives/Button';
import AdminProductForm from './AdminProductForm';
import { Icons } from '../../components/Icons';
import { useResource, selectProducts } from '../../lib/useResource';
import { money } from '../../lib/format';
import { adminAPI, productsAPI } from '../../services/api';
import styles from './AdminTable.module.css';

/**
 * ADMIN — PRODUCTS.
 *
 * Fixes, in order of how much damage they could do:
 *
 *  1. THE DELETE BUTTON DOESN'T DELETE, AND SAID NOTHING ABOUT IT.
 *     `deleteProduct` in the backend controller is a soft delete — it sets
 *     `isActive: false` and keeps the record. But `buildFilters` in
 *     utils/helpers.js hardcodes `filters.isActive = true` with no way to
 *     override it from the query string, and `GET /api/products` is the only
 *     list endpoint there is. So an unlisted product vanishes from this page,
 *     permanently, while its row sits intact in the database.
 *
 *     The wording now matches what actually happens, because "Delete" plus an
 *     irreversible disappearance plus a surviving record is the worst of all
 *     three readings. Restoring one needs a backend change; see the note at the
 *     bottom of this file.
 *
 *     It was also a `window.confirm()` reading "Are you sure you want to delete
 *     this product?" — no product name in it, so after a mis-click you couldn't
 *     tell which row you were about to lose. The confirmation is inline in the
 *     row now, and it names the product.
 *
 *  2. `handleSave` HAD NO try/catch. An update that failed rejected a promise
 *     nobody was awaiting — the list silently kept the old values while the
 *     database kept the new ones, or didn't. Errors now surface in the page.
 *
 *  3. THE FETCH SWALLOWED ITS ERROR into console.error and rendered an empty
 *     table, which is exactly what "no products" looks like. On a catalogue
 *     screen that means an unreachable backend reads as an empty shop.
 *
 *  4. `https://via.placeholder.com/50` FOR MISSING IMAGES. A request to a
 *     third-party domain, from an admin page, on every image-less row — and a
 *     dead one if that service is blocked or gone, which leaves a broken-image
 *     icon. Missing images are handled in CSS now, with no network call.
 *
 *  5. Optimistic updates read `products` from the closure, so two quick edits
 *     could drop the first. Functional updates throughout.
 *
 *  6. The colour swatches were bare coloured circles with a `title`. Title
 *     attributes don't show on touch and aren't reliably announced, so the only
 *     information was the colour itself — useless to anyone who can't
 *     distinguish two similar shades. The names are now real text, visually
 *     hidden but read out.
 */

export default function AdminProducts() {
    /* useCallback with an empty dep list because useResource keeps the fetcher
       in its effect's dependency array — an inline arrow would refetch on every
       render, forever. */
    const fetchProducts = useCallback(
        (options) => productsAPI.getAll({ limit: 1000 }, options),
        []
    );

    const { data, setData, status, error, retry } = useResource(
        fetchProducts,
        selectProducts
    );

    const products = data || [];

    const [formFor, setFormFor] = useState(null); /* null | 'new' | product */
    const [confirmingId, setConfirmingId] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [writeError, setWriteError] = useState('');

    const save = async (productData) => {
        setWriteError('');

        const editing = formFor && formFor !== 'new' ? formFor : null;

        /* NOT wrapped in try/catch, deliberately. A rejection here propagates to
           the form's own submit handler, which is what keeps the dialog open with
           everything the user typed still in it — and `setFormFor(null)` below is
           skipped on the way out, so a failed save can't close the form.

           The message is also deliberately not put into `writeError`. That banner
           renders at the top of this page, which while the dialog is open sits
           behind the scrim, so setting it would produce an error nobody can see.
           The form reports save failures itself; `writeError` is for the unlist
           path, which has no dialog over it. */
        if (editing) {
            const result = await adminAPI.updateProduct(editing._id, productData);
            setData((prev) =>
                (prev || []).map((p) =>
                    p._id === editing._id
                        ? result?.product || { ...p, ...productData }
                        : p
                )
            );
        } else {
            const result = await adminAPI.createProduct(productData);
            if (result?.product) {
                setData((prev) => [result.product, ...(prev || [])]);
            } else {
                /* The endpoint didn't echo the created record, so refetch rather
                   than inventing one with a fabricated _id. */
                retry();
            }
        }

        setFormFor(null);
    };

    const remove = async (product) => {
        setBusyId(product._id);
        setWriteError('');

        try {
            /* The endpoint is called deleteProduct but it sets isActive: false.
               The record survives; only its listing goes. */
            await adminAPI.deleteProduct(product._id);
            setData((prev) => (prev || []).filter((p) => p._id !== product._id));
            setConfirmingId(null);
        } catch (err) {
            setWriteError(
                `${product.name || 'That product'} couldn’t be unlisted: ${
                    err?.message || 'the request failed'
                }`
            );
        } finally {
            setBusyId(null);
        }
    };

    if (status === 'loading') {
        return (
            <p className={styles.empty} aria-live="polite">
                Reading the catalogue…
            </p>
        );
    }

    if (status === 'error') {
        return (
            <div className={styles.empty}>
                <p className={styles.emptyTitle}>Couldn’t load products</p>
                <p className={styles.emptyText} role="alert">
                    {error}
                </p>
                <div className={styles.emptyActions}>
                    <Button variant="riso" size="md" onClick={retry}>
                        <Icons.RefreshCw size={14} /> Try again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            {writeError ? (
                <p className={styles.failure} role="alert">
                    {writeError}
                </p>
            ) : null}

            <div className={styles.toolbar}>
                <p className={styles.count}>
                    {products.length}{' '}
                    {products.length === 1 ? 'listed product' : 'listed products'}
                </p>

                <Button
                    variant="riso"
                    size="md"
                    onClick={() => {
                        setFormFor('new');
                        setWriteError('');
                    }}
                >
                    <Icons.Plus size={15} /> Add a product
                </Button>
            </div>

            {products.length === 0 ? (
                <div className={styles.empty}>
                    <p className={styles.emptyTitle}>Nothing listed</p>
                    <p className={styles.emptyText}>
                        The storefront will show an empty catalogue. Either there
                        are no products yet, or every one of them has been
                        unlisted — this list only fetches listed products, so it
                        can’t tell you which.
                    </p>
                </div>
            ) : (
                <div
                    className={styles.scroller}
                    tabIndex={0}
                    role="region"
                    aria-label="Product catalogue, scrollable"
                >
                    <table className={styles.table}>
                        <caption>
                            Every listed product. Each row can be edited or
                            unlisted; unlisting asks for confirmation first and
                            removes the product from this list.
                        </caption>

                        <thead>
                            <tr>
                                <th scope="col">
                                    <span className={styles.srOnly}>Image</span>
                                </th>
                                <th scope="col">Name</th>
                                <th scope="col">Category</th>
                                <th scope="col">Price</th>
                                <th scope="col">Colours</th>
                                <th scope="col">Stock</th>
                                <th scope="col">
                                    <span className={styles.srOnly}>Actions</span>
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {products.map((product) => {
                                const image =
                                    product.images?.[0]?.url || product.image;

                                const sizes = Array.isArray(product.sizes)
                                    ? product.sizes
                                    : [];
                                const stock = sizes.reduce(
                                    (sum, s) => sum + (Number(s.stock) || 0),
                                    0
                                );
                                const level =
                                    stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok';

                                const colors = Array.isArray(product.colors)
                                    ? product.colors
                                    : [];

                                const isConfirming = confirmingId === product._id;

                                return (
                                    <tr
                                        key={product._id}
                                        data-busy={busyId === product._id}
                                    >
                                        <td>
                                            {image ? (
                                                <img
                                                    className={styles.thumb}
                                                    src={image}
                                                    alt=""
                                                    loading="lazy"
                                                />
                                            ) : (
                                                /* No network round trip for a
                                                   missing image, and aria-hidden
                                                   because the product name in the
                                                   next cell already identifies
                                                   the row. */
                                                <span
                                                    className={styles.noThumb}
                                                    aria-hidden="true"
                                                >
                                                    —
                                                </span>
                                            )}
                                        </td>

                                        <td className={styles.name}>
                                            {product.name}
                                        </td>

                                        <td className={styles.category}>
                                            {product.category || '—'}
                                        </td>

                                        <td className={styles.num}>
                                            {money(product.price)}
                                        </td>

                                        <td>
                                            {colors.length === 0 ? (
                                                <span className={styles.more}>
                                                    None
                                                </span>
                                            ) : (
                                                <div className={styles.dots}>
                                                    {colors
                                                        .slice(0, 4)
                                                        .map((c, i) => (
                                                            <span
                                                                key={`${
                                                                    c.name || i
                                                                }`}
                                                                className={
                                                                    styles.dot
                                                                }
                                                                style={{
                                                                    backgroundColor:
                                                                        c.hexCode ||
                                                                        'transparent',
                                                                }}
                                                                aria-hidden="true"
                                                            />
                                                        ))}

                                                    {colors.length > 4 ? (
                                                        <span
                                                            className={styles.more}
                                                            aria-hidden="true"
                                                        >
                                                            +{colors.length - 4}
                                                        </span>
                                                    ) : null}

                                                    {/* The actual information.
                                                        A swatch alone is not
                                                        readable. */}
                                                    <span className={styles.srOnly}>
                                                        {colors
                                                            .map(
                                                                (c) =>
                                                                    c.name ||
                                                                    'unnamed'
                                                            )
                                                            .join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        <td>
                                            <span
                                                className={styles.stock}
                                                data-level={level}
                                            >
                                                {stock === 0
                                                    ? 'Sold out'
                                                    : `${stock} left`}
                                            </span>
                                        </td>

                                        <td>
                                            {isConfirming ? (
                                                <div className={styles.actions}>
                                                    {/* Names the product, which
                                                        window.confirm never
                                                        did — and says where it
                                                        goes, which is nowhere
                                                        you can get it back
                                                        from. */}
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() =>
                                                            remove(product)
                                                        }
                                                        loading={
                                                            busyId === product._id
                                                        }
                                                    >
                                                        Unlist “{product.name}”
                                                        for good
                                                    </Button>
                                                    <Button
                                                        variant="quiet"
                                                        size="sm"
                                                        onClick={() =>
                                                            setConfirmingId(null)
                                                        }
                                                    >
                                                        Keep it
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        className={styles.iconBtn}
                                                        onClick={() => {
                                                            setFormFor(product);
                                                            setWriteError('');
                                                        }}
                                                    >
                                                        <Icons.Edit size={15} />
                                                        <span
                                                            className={
                                                                styles.srOnly
                                                            }
                                                        >
                                                            Edit {product.name}
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.iconBtn}
                                                        data-kind="danger"
                                                        onClick={() =>
                                                            setConfirmingId(
                                                                product._id
                                                            )
                                                        }
                                                    >
                                                        <Icons.Trash size={15} />
                                                        <span
                                                            className={
                                                                styles.srOnly
                                                            }
                                                        >
                                                            Unlist {product.name}
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {formFor ? (
                /* Keyed by record, so switching from one product to another —
                   or from a product to Add — remounts the form and reruns its
                   initialiser. The old form tried to do this with a
                   prop→state useEffect guarded by `if (product)`, which meant
                   opening Add straight after Edit kept every one of the
                   previous product's values. */
                <AdminProductForm
                    key={formFor === 'new' ? 'new' : formFor._id}
                    product={formFor === 'new' ? null : formFor}
                    onSave={save}
                    onClose={() => setFormFor(null)}
                />
            ) : null}
        </>
    );
}

/* ---------------------------------------------------------------------------
   THE ONE THING THIS PAGE CANNOT FIX FROM THE FRONT END.

   Unlisting is reversible in the database — the record keeps every field, and
   `PUT /api/products/:id` passes `req.body` straight to findByIdAndUpdate, so
   sending `isActive: true` would restore it. The product form has the checkbox
   to do exactly that.

   What's missing is a way to SEE an unlisted product. `buildFilters` in
   backend/src/utils/helpers.js ends with an unconditional

       filters.isActive = true;

   and `GET /api/products` is the only list endpoint. So the moment a product is
   unlisted it becomes unreachable from the admin UI, and the restore path exists
   but can never be reached.

   The backend fix is one line — honour an explicit flag instead of forcing the
   filter, e.g. `if (query.includeUnlisted !== 'true') filters.isActive = true;`
   — guarded by the admin middleware so the storefront can't ask for unlisted
   stock. That's a backend change, outside what was scoped here, so it's flagged
   rather than made: the alternative was a UI that quietly implies it can bring
   something back when it can't.
   --------------------------------------------------------------------------- */
