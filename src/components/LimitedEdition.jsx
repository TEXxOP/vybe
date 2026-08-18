import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Plate from './primitives/Plate';
import Ink from './primitives/Ink';
import Button from './primitives/Button';
import Reveal from './primitives/Reveal';
import Stamp from './primitives/Stamp';
import { Icons } from './Icons';
import { productsAPI } from '../services/api';
import { ROUTES } from '../lib/routes';
import { money } from '../lib/format';
import { msToNextDrop, splitRemaining } from '../lib/drops';
import styles from './LimitedEdition.module.css';

/**
 * PLATE 04 — Limited Edition. The back page: what's left, and for how long.
 *
 * ── The countdown ──────────────────────────────────────────────────────────
 * The previous one was seeded with a literal `{ days: 2, hours: 13, minutes:
 * 22, seconds: 45 }` and decremented from there. So it restarted at exactly
 * two days, thirteen hours on every page load, every route change back to the
 * homepage, and every visitor's first view — for the rest of the site's life.
 * Its `days === 0` branch also zeroed the whole clock the moment the day
 * counter hit zero, so the final twenty-four hours never counted down at all.
 *
 * It counts to a real moment now: drops land Friday at 20:00, local time. The
 * target is recomputed from the clock on every tick rather than tracked in
 * state, which means it rolls over to next Friday by itself and can't drift.
 *
 * ── The scarcity bar ──────────────────────────────────────────────────────
 * The old bar defaulted missing stock to 50 out of a hardcoded max of 50, and
 * `/products/limited` returns documents whose stock lives in `sizes[].stock`,
 * not in `limitedStock`. Every real product therefore drew a bar at exactly 0%
 * sold and a label reading "50 units left" regardless of its actual stock. Now
 * a product with no usable stock figure simply gets no bar — an empty progress
 * bar is worse than none.
 *
 * ── Removed ───────────────────────────────────────────────────────────────
 * Four pagination dots (one permanently `.active`) and a prev/next pair, all
 * six of them attached to nothing. There are four cards and they are all on
 * screen at once.
 */

/* Drops land Friday evening; the schedule itself lives in lib/drops.js. */

const pad = (n) => String(n).padStart(2, '0');

const UNITS = [
  ['days', 'days'],
  ['hours', 'hrs'],
  ['minutes', 'min'],
  ['seconds', 'sec'],
];

/**
 * Its own component purely so the once-a-second state change re-renders four
 * numbers instead of the whole plate and its four product cards.
 */
function DropCountdown() {
  const [remaining, setRemaining] = useState(() =>
    splitRemaining(msToNextDrop())
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(splitRemaining(msToNextDrop()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.countdown}>
      <p className={styles.countdownLabel}>
        <Icons.Clock size={14} />
        Next drop in
      </p>

      {/* The digits change every second, so they're hidden from assistive tech
          and the same information is given once, as a sentence, below. */}
      <div className={styles.clock} aria-hidden="true">
        {UNITS.map(([key, unit], i) => (
          <span className={styles.unit} key={key}>
            {i > 0 ? (
              <span className={styles.colon} aria-hidden="true">
                :
              </span>
            ) : null}
            <span className={styles.digits}>{pad(remaining[key])}</span>
            <span className={styles.unitName}>{unit}</span>
          </span>
        ))}
      </div>

      <p className="visuallyHidden">
        The next drop opens Friday at 8pm, in {remaining.days} days and{' '}
        {remaining.hours} hours.
      </p>
    </div>
  );
}

/* Fallback content for when the API is unreachable. Flagged as demo so the
   cards link to the shop rather than to /product/1, which never existed. */
const FALLBACK = [
  {
    _id: 'demo-1',
    demo: true,
    name: 'Chroma Surge Jacket',
    price: 4999,
    category: 'Outerwear',
    limitedStock: 50,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop',
      },
    ],
  },
  {
    _id: 'demo-2',
    demo: true,
    name: 'Vivid Blueprint Shirt',
    price: 1999,
    category: 'Tops',
    limitedStock: 8,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&h=800&fit=crop',
      },
    ],
  },
  {
    _id: 'demo-3',
    demo: true,
    name: 'Heritage Wave Cap',
    price: 1499,
    category: 'Accessories',
    limitedStock: 5,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=800&fit=crop',
      },
    ],
  },
  {
    _id: 'demo-4',
    demo: true,
    name: 'Graffiti Canvas Cargo',
    price: 3499,
    category: 'Bottoms',
    limitedStock: 12,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=800&fit=crop',
      },
    ],
  },
];

const RUN_SIZE = 50; // Units per limited run — the denominator for the bar.

/** Stock left, from whichever field the document actually carries. Returns
 *  null when there is no usable figure, which is a valid answer. */
function stockLeft(product) {
  if (Number.isFinite(product.limitedStock)) return product.limitedStock;
  if (Number.isFinite(product.totalStock)) return product.totalStock;
  if (Array.isArray(product.sizes) && product.sizes.length) {
    return product.sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
  }
  return null;
}

function badgeText(product) {
  const left = stockLeft(product);
  if (left === 0) return 'Sold out';
  if (left != null && left <= 5) return `Only ${left} Left!`;
  if (left != null && left <= 12) return `${left} Remaining`;
  if (product.badge === 'limited') return 'Final Drop';
  if (left != null) return `Only ${left} Made`;
  return 'Limited Edition';
}

function LimitedCard({ product }) {
  const left = stockLeft(product);
  const sold = left == null ? null : Math.max(0, RUN_SIZE - left);
  const soldPct = sold == null ? null : Math.min(100, Math.round((sold / RUN_SIZE) * 100));
  const image = product.images?.[0]?.url;
  const to = product.demo ? ROUTES.shop : ROUTES.product(product._id);
  const isOut = left === 0;

  return (
    <Link className={styles.card} to={to}>
      <Stamp
        tone={isOut ? 'muted' : 'pink'}
        solid={!isOut}
        className={styles.cardBadge}
      >
        {badgeText(product)}
      </Stamp>

      <Ink
        src={image}
        alt={product.name}
        ratio="3 / 4"
        plate={isOut ? 'none' : 'pink'}
        className={styles.cardInk}
        sizes="(min-width: 900px) 22vw, 45vw"
      />

      <div className={styles.cardBody}>
        {product.category ? (
          <p className={styles.cardCat}>{product.category}</p>
        ) : null}

        <h3 className={styles.cardName}>{product.name}</h3>

        <p className={styles.cardPrice}>{money(product.price)}</p>

        {/* Only drawn when there is a real number behind it. */}
        {soldPct != null ? (
          <div className={styles.scarcity}>
            <div
              className={styles.track}
              role="progressbar"
              aria-valuenow={soldPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${soldPct}% of this run sold`}
            >
              <span
                className={styles.fill}
                style={{ inlineSize: `${soldPct}%` }}
              />
            </div>
            <p className={styles.scarcityLabel}>
              {isOut
                ? 'Run complete'
                : soldPct >= 90
                  ? 'Almost gone!'
                  : `${left} of ${RUN_SIZE} left`}
            </p>
          </div>
        ) : null}

        <span className={styles.cardCue} aria-hidden="true">
          View product →
        </span>
      </div>
    </Link>
  );
}

export default function LimitedEdition() {
  const [products, setProducts] = useState(null); // null = still loading

  useEffect(() => {
    let live = true;
    productsAPI
      .getLimited()
      .then((res) => {
        const list = res?.products || res?.data || [];
        if (live) setProducts(list.length ? list.slice(0, 4) : FALLBACK);
      })
      .catch(() => {
        if (live) setProducts(FALLBACK);
      });
    return () => {
      live = false;
    };
  }, []);

  const loading = products === null;

  return (
    <Plate id="drops" index={4} ink="pink + ink" tone="ink">
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            Drops &amp; Exclusives
          </p>

          <h2 className={styles.title}>
            Limited
            <span className={styles.titleShout}>
              <span className={styles.titleGhost} aria-hidden="true">
                Edition
              </span>
              <span className={styles.titleInk}>Edition</span>
            </span>
          </h2>

          <p className={styles.subtitle}>
            Once it&apos;s gone, it&apos;s gone — forever.
          </p>
        </div>

        <DropCountdown />
      </header>

      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div className={styles.skeleton} key={i} aria-hidden="true">
                <div className={styles.skeletonInk} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
            ))
          : products.map((product, i) => (
              <Reveal
                key={product._id}
                variant="up"
                delay={i * 70}
                className={styles.cell}
              >
                <LimitedCard product={product} />
              </Reveal>
            ))}
      </div>

      <div className={styles.foot}>
        <Button to={ROUTES.shop} variant="onInk" size="lg">
          View All Limited Editions
        </Button>
      </div>
    </Plate>
  );
}
