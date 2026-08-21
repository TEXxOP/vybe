import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Plate from '../components/primitives/Plate';
import Stamp from '../components/primitives/Stamp';
import Ink from '../components/primitives/Ink';
import Button from '../components/primitives/Button';
import Field from '../components/primitives/Field';
import Reveal from '../components/primitives/Reveal';
import { Icons } from '../components/Icons';

import { productsAPI } from '../services/api';
import { money, discountPercent } from '../lib/format';
import { ROUTES } from '../lib/routes';
import styles from './Shop.module.css';

/**
 * Shop — the catalogue sheet.
 *
 * Six functional faults in the previous version, in rough order of severity:
 *
 *  1. THE HOMEPAGE LINKED HERE AND THE FILTER WAS IGNORED. Every Collections
 *     card resolves through shopCategory(), which produces /shop?category=x.
 *     This page never called useSearchParams, so all three cards landed on an
 *     identical unfiltered grid. The header's search does the same thing with
 *     ?q=, so search was equally dead. The URL is now the only source of
 *     truth — which also makes a filtered view shareable and the back button
 *     work, neither of which was true before.
 *
 *  2. PRODUCTS 11 AND UP WERE UNREACHABLE. The backend paginates at a default
 *     limit of 10 and returns { total, page, pages }. All three were discarded
 *     and no pagination was rendered, so an eleventh product could not be
 *     reached from anywhere in the storefront.
 *
 *  3. RATINGS WERE INVENTED. `product.rating?.average || 4.5` printed 4.5
 *     stars for every product that had never been rated — the schema defaults
 *     average to 0, which is falsy, so the fallback always won. A real 0 also
 *     rendered as 4.5. Ratings now appear only when rating.count > 0.
 *
 *  4. A FAILED REQUEST LOOKED LIKE AN EMPTY CATEGORY. The catch only
 *     console.error'd, leaving products at [], so a dead backend rendered "No
 *     products found in this category." Loading, error and empty are now three
 *     distinct states and cannot be confused.
 *
 *  5. FILTER CLICKS RACED. Two requests in flight, and whichever landed last
 *     won — not the one you asked for. Each request now carries an
 *     AbortController.
 *
 *  6. comparePrice WAS NEVER SHOWN. The field exists on every product and the
 *     grid ignored it, so nothing was ever visibly on sale.
 *
 * Search is a separate backend endpoint that neither paginates nor accepts a
 * category, so ?q= deliberately replaces the browse controls rather than
 * pretending to combine with them.
 */

const PAGE_SIZE = 12;

/* The category enum from the Product schema, in the schema's own order. */
const CATEGORIES = [
    'all',
    'jackets',
    'shirts',
    'hoodies',
    'pants',
    'shoes',
    'caps',
    'accessories',
];

/* `param` is what the backend sort expects; `value` is what lives in the URL,
   so the querystring stays readable rather than leaking Mongo field names. */
const SORTS = [
    { value: 'newest', label: 'Newest first', param: '-createdAt' },
    { value: 'popular', label: 'Best selling', param: '-soldCount' },
    { value: 'price-low', label: 'Price: low to high', param: 'price' },
    { value: 'price-high', label: 'Price: high to low', param: '-price' },
];

/* The badge enum, mapped to a real Stamp tone. The old grid interpolated the
   raw enum value straight into a className, so a schema change would have
   silently produced an unstyled badge. */
const BADGES = {
    new: { label: 'New in', tone: 'blue', solid: true },
    bestseller: { label: 'Bestseller', tone: 'ink', solid: true },
    limited: { label: 'Limited run', tone: 'pink', solid: true },
    sale: { label: 'On sale', tone: 'pink', solid: false },
    soldout: { label: 'Sold out', tone: 'muted', solid: false },
};

/* Rotating ink so a long grid reads as a print run rather than a spreadsheet. */
const PLATES = ['pink', 'orange', 'blue'];

/**
 * Sold out means "we know the sizes and they are all at zero". A product with
 * no sizes array yet is unknown, not unavailable — the virtual reduces an empty
 * array to 0, which would otherwise mark every half-entered product sold out.
 */
function isSoldOut(product) {
    if (product.badge === 'soldout') return true;
    if (!Array.isArray(product.sizes) || product.sizes.length === 0) return false;
    const total = product.sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
    return total === 0;
}

function ProductCard({ product, index }) {
    const image = product.images?.[0];
    const badge = BADGES[product.badge];
    const off = discountPercent(product.price, product.comparePrice);
    const rated = Number(product.rating?.count) > 0;
    const soldOut = isSoldOut(product);

    return (
        <Reveal
            as="li"
            className={styles.cell}
            delay={Math.min(index, 8) * 55}
        >
            <Link
                className={styles.card}
                to={ROUTES.product(product._id)}
                aria-label={`${product.name}, ${money(product.price)}${soldOut ? ', sold out' : ''}`}
            >
                <div className={styles.frame}>
                    <Ink
                        src={image?.url || ''}
                        alt={image?.alt || product.name}
                        ratio="4 / 5"
                        plate={PLATES[index % PLATES.length]}
                        sizes="(min-width: 900px) 30vw, (min-width: 640px) 45vw, 92vw"
                    />

                    {badge ? (
                        <Stamp
                            className={styles.badge}
                            tone={badge.tone}
                            solid={badge.solid}
                            angle={-3}
                        >
                            {badge.label}
                        </Stamp>
                    ) : null}

                    {off > 0 && product.badge !== 'sale' ? (
                        <Stamp className={styles.off} tone="pink" solid angle={4}>
                            {off}% off
                        </Stamp>
                    ) : null}

                    {soldOut ? (
                        <span className={styles.soldOut} aria-hidden="true">
                            <span className={styles.soldOutRule} />
                            <span className={styles.soldOutWord}>Sold out</span>
                        </span>
                    ) : null}
                </div>

                <div className={styles.caption}>
                    <h3 className={styles.name}>{product.name}</h3>

                    <p className={styles.prices}>
                        <span className={styles.price}>{money(product.price)}</span>
                        {off > 0 ? (
                            <>
                                <s className={styles.was}>{money(product.comparePrice)}</s>
                                <span className="visuallyHidden">
                                    reduced from {money(product.comparePrice)}
                                </span>
                            </>
                        ) : null}
                    </p>

                    <p className={styles.meta}>
                        <span className={styles.cat}>{product.category}</span>

                        {/* Only shown when somebody actually rated it. */}
                        {rated ? (
                            <span className={styles.rating}>
                                <Icons.Star size={12} filled />
                                {Number(product.rating.average).toFixed(1)}
                                <span className="visuallyHidden">
                                    out of 5, from {product.rating.count} ratings
                                </span>
                            </span>
                        ) : null}
                    </p>

                    <span className={styles.cue} aria-hidden="true">
                        View plate <Icons.ArrowRight size={13} />
                    </span>
                </div>
            </Link>
        </Reveal>
    );
}

export default function Shop() {
    const [params, setParams] = useSearchParams();

    /* Everything the page renders is read back out of the URL. */
    const q = (params.get('q') || '').trim();
    const category = CATEGORIES.includes(params.get('category'))
        ? params.get('category')
        : 'all';
    const sortValue = SORTS.some((s) => s.value === params.get('sort'))
        ? params.get('sort')
        : 'newest';
    const page = Math.max(1, Number(params.get('page')) || 1);

    const sortParam = SORTS.find((s) => s.value === sortValue).param;
    const searching = q.length > 0;
    const qTooShort = searching && q.length < 2;

    /* Retry has to be able to re-run an effect whose inputs haven't changed. */
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState(null);
    const resultsTop = useRef(null);

    /* One string identifying the request the page is currently displaying.
       Loading is then *derived* — "the result I hold isn't for the query I'm
       showing" — rather than being a second state that has to be kept in sync
       with the first, and rather than a setState in the effect body. */
    const key = useMemo(
        () => [q, category, sortValue, page, attempt].join('|'),
        [q, category, sortValue, page, attempt]
    );

    const status = qTooShort
        ? 'short'
        : result?.key !== key
          ? 'loading'
          : result.error
            ? 'error'
            : 'ready';

    useEffect(() => {
        if (qTooShort) return undefined;

        const ac = new AbortController();
        const opts = { signal: ac.signal };

        const request = searching
            ? productsAPI.search(q, opts)
            : productsAPI.getAll(
                  {
                      category: category === 'all' ? '' : category,
                      sort: sortParam,
                      page,
                      limit: PAGE_SIZE,
                  },
                  opts
              );

        request
            .then((data) => {
                const products = data.products || [];
                setResult({
                    key,
                    products,
                    // Search doesn't paginate, so its total is what came back.
                    total: Number.isFinite(data.total) ? data.total : products.length,
                    pages: Number.isFinite(data.pages) ? data.pages : 1,
                });
            })
            .catch((err) => {
                if (err?.name === 'AbortError') return;
                setResult({
                    key,
                    products: [],
                    total: 0,
                    pages: 1,
                    error:
                        err?.message ||
                        'The catalogue could not be loaded just now.',
                });
            });

        return () => ac.abort();
    }, [key, q, category, sortParam, page, searching, qTooShort]);

    const products = status === 'ready' ? result.products : [];
    const total = status === 'ready' ? result.total : 0;
    const pages = status === 'ready' ? result.pages : 1;

    /* One writer for the querystring. Any filter change drops the page number,
       because page 4 of a different filter is meaningless — and landing on an
       empty page 4 was the kind of thing that used to look like "no products". */
    const update = (patch) => {
        setParams((prev) => {
            const next = new URLSearchParams(prev);
            for (const [k, v] of Object.entries(patch)) {
                if (v === null || v === '' || v === 'all') next.delete(k);
                else next.set(k, String(v));
            }
            if (!('page' in patch)) next.delete('page');
            return next;
        });
    };

    const goToPage = (nextPage) => {
        update({ page: nextPage > 1 ? nextPage : null });
        // Smoothness is decided by scroll-behavior in global.css, which is
        // already switched off under prefers-reduced-motion.
        resultsTop.current?.scrollIntoView({ block: 'start' });
    };

    const first = (page - 1) * PAGE_SIZE + 1;
    const last = Math.min(page * PAGE_SIZE, total);

    return (
        <Plate
            id="catalogue"
            tone="paper"
            label={searching ? 'Catalogue · search' : `Catalogue · sheet ${page}`}
        >
            <header className={styles.masthead}>
                <Stamp tone="pink" solid angle={-2}>
                    {searching ? 'Search' : 'The catalogue'}
                </Stamp>

                <h1 className={styles.title}>
                    {searching ? (
                        <>
                            Results for
                            <span className={styles.query}>“{q}”</span>
                        </>
                    ) : (
                        <>
                            Everything
                            <span className={styles.titleLine}>in print</span>
                        </>
                    )}
                </h1>

                <p className={styles.lede}>
                    {searching
                        ? 'Search looks across names, descriptions and tags. It returns the closest twenty matches, unfiltered.'
                        : 'One sheet per twelve garments. Filter it, sort it, or read it end to end — the address bar keeps your place, so you can send anyone the exact view you are looking at.'}
                </p>

                {searching ? (
                    <p className={styles.clearRow}>
                        <Button to={ROUTES.shop} variant="quiet" size="sm">
                            ← Back to the full catalogue
                        </Button>
                    </p>
                ) : null}
            </header>

            {/* Browse controls are meaningless in search mode, because the
                search endpoint accepts neither a category nor a sort. Hiding
                them is more honest than showing controls that do nothing. */}
            {!searching ? (
                <div className={styles.controls}>
                    <div
                        className={styles.cats}
                        role="group"
                        aria-label="Filter by category"
                    >
                        {CATEGORIES.map((cat) => {
                            const on = cat === category;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    className={styles.catBtn}
                                    data-on={on ? 'true' : 'false'}
                                    aria-pressed={on}
                                    onClick={() => update({ category: cat })}
                                >
                                    {cat === 'all' ? 'Everything' : cat}
                                </button>
                            );
                        })}
                    </div>

                    <Field
                        className={styles.sort}
                        label="Sort"
                        name="sort"
                        as="select"
                        options={SORTS.map((s) => ({
                            value: s.value,
                            label: s.label,
                        }))}
                        value={sortValue}
                        onChange={(e) => update({ sort: e.target.value })}
                    />
                </div>
            ) : null}

            <div className={styles.results} ref={resultsTop}>
                {/* Announced once per settled result, so the grid changing
                    underneath a screen reader isn't silent. */}
                <p className={styles.count} aria-live="polite">
                    {status === 'loading' ? (
                        <span className={styles.pulse}>Setting the type…</span>
                    ) : status === 'ready' && total > 0 ? (
                        searching ? (
                            <>
                                {total} {total === 1 ? 'match' : 'matches'}
                            </>
                        ) : (
                            <>
                                Showing {first}–{last} of {total}
                                {category !== 'all' ? ` in ${category}` : ''}
                            </>
                        )
                    ) : (
                        <span className="visuallyHidden">No results</span>
                    )}
                </p>

                {status === 'short' ? (
                    <div className={styles.notice}>
                        <p className={styles.noticeTitle}>
                            Two letters, minimum
                        </p>
                        <p className={styles.noticeBody}>
                            A single character matches almost everything, so the
                            search needs at least two.
                        </p>
                        <Button to={ROUTES.shop} variant="ink">
                            Browse the catalogue instead
                        </Button>
                    </div>
                ) : status === 'error' ? (
                    <div className={styles.notice}>
                        <Stamp tone="danger" solid angle={-2}>
                            Press jam
                        </Stamp>
                        <p className={styles.noticeTitle}>
                            This sheet didn&apos;t come off the press
                        </p>
                        <p className={styles.noticeBody}>{result.error}</p>
                        <Button
                            variant="ink"
                            onClick={() => setAttempt((n) => n + 1)}
                        >
                            Run it again
                        </Button>
                    </div>
                ) : status === 'loading' ? (
                    <ul className={styles.grid} aria-hidden="true">
                        {Array.from({ length: PAGE_SIZE }, (_, i) => (
                            <li className={styles.cell} key={i}>
                                <div className={styles.skeleton}>
                                    <div className={styles.skeletonFrame} />
                                    <div className={styles.skeletonLine} />
                                    <div className={styles.skeletonLineShort} />
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : products.length === 0 ? (
                    <div className={styles.notice}>
                        <p className={styles.noticeTitle}>
                            {searching
                                ? `Nothing matched “${q}”`
                                : `No ${category === 'all' ? 'garments' : category} in this run`}
                        </p>
                        <p className={styles.noticeBody}>
                            {searching
                                ? 'Try a shorter phrase, or a colour, or the name of a collection.'
                                : 'This category is empty for now. New plates go on press every Friday.'}
                        </p>
                        {category !== 'all' || searching ? (
                            <Button to={ROUTES.shop} variant="ink">
                                See everything
                            </Button>
                        ) : null}
                    </div>
                ) : (
                    <ul className={styles.grid}>
                        {products.map((product, i) => (
                            <ProductCard
                                key={product._id}
                                product={product}
                                index={i}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {/* Pagination exists at all now. Search is excluded because its
                endpoint returns a single capped set. */}
            {status === 'ready' && !searching && pages > 1 ? (
                <nav className={styles.pager} aria-label="Catalogue sheets">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => goToPage(page - 1)}
                    >
                        <Icons.ArrowLeft size={14} /> Previous
                    </Button>

                    <p className={styles.sheet}>
                        Sheet <strong>{String(page).padStart(2, '0')}</strong>
                        <span className={styles.sheetOf}>of</span>
                        {String(pages).padStart(2, '0')}
                    </p>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= pages}
                        onClick={() => goToPage(page + 1)}
                    >
                        Next <Icons.ArrowRight size={14} />
                    </Button>
                </nav>
            ) : null}
        </Plate>
    );
}
