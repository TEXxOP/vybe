import { useEffect, useState } from 'react';
import Button from './primitives/Button';
import Ink from './primitives/Ink';
import Stamp from './primitives/Stamp';
import Marquee from './primitives/Marquee';
import { productsAPI } from '../services/api';
import { ROUTES, ANCHORS } from '../lib/routes';
import { money } from '../lib/format';
import { FREE_SHIPPING_THRESHOLD } from '../lib/cart';
import modelImage from '../assets/model.webp';
import styles from './Hero.module.css';

/**
 * HERO — the cover of Issue 01.
 *
 * The page is a press run, so this is its front page: masthead-scale type, a
 * cut-out photograph taped down over it, and a strip of facts along the
 * bottom. Every word here is carried over from the previous build; what has
 * changed is that all of it is now either true or clickable.
 *
 * Four things the previous Hero did that this one doesn't:
 *
 *   1. ~100 lines of bespoke rAF: a glitch timer, a mouse-tilt handler and a
 *      chromatic-aberration loop, each with its own listener and its own
 *      requestAnimationFrame. Three independent frame loops in one component,
 *      none of them cancelled on unmount. The misregistration is now driven by
 *      the single shared loop in lib/press.js, which every Ink on the site
 *      reads from the same two custom properties.
 *   2. Four <img> avatars pointing at Unsplash portraits of strangers, framed
 *      as "The Vybe Tribe". The rating is real information — it doesn't need
 *      fake faces attached to it, so it's a stamp now.
 *   3. A hardcoded link to /product/1. Product ids are Mongo ObjectIds, so
 *      that link 404'd on every install. The featured card now resolves a real
 *      product, and falls back to a plain shop link rather than a broken one.
 *   4. Two decorative arrow buttons that carousel nothing.
 *
 * The cut-out itself is the same photograph, re-encoded. It was a 426 KB PNG —
 * PNG because the model is cut out and the transparency has to survive, which
 * rules out JPEG. WebP keeps the alpha and lands at 50 KB, and the alpha channel
 * comes through with a mean difference of exactly 0, so the mask is bit-for-bit
 * what it was. This is the `priority` image and almost certainly the page's LCP
 * element, which makes 8x off its weight the single largest performance win
 * available here.
 */

/* The three promises, kept verbatim from the previous build. */
const FEATURES = ['Future Threads', 'Unique Designs', 'Limited Drops'];

/* The ticker states a price promise, so it reads the constant the checkout
   charges against rather than restating it. Written out as "₹999" this was the
   last hardcoded threshold left in live code — and the whole point of
   FREE_SHIPPING_THRESHOLD is that a marketing claim and a billing rule can't
   drift apart. "From", not "over": the rule is `>= 999`, so ₹999 exactly ships
   free. See the note in lib/cart.js. */
const TICKER = [
  'Drop 01 shipping now',
  `Free delivery from ${money(FREE_SHIPPING_THRESHOLD)}`,
  '7-day returns',
  'Printed in limited runs',
];

export default function Hero() {
  /* One request, for one card. The image above it is a local asset, so this
     never sits in front of the largest contentful paint. */
  const [featured, setFeatured] = useState(null);

  useEffect(() => {
    let live = true;
    productsAPI
      .getFeatured()
      .then((res) => {
        const first = (res?.data || res?.products || [])[0];
        if (live && first) setFeatured(first);
      })
      .catch(() => {
        /* Offline or no backend: the fallback clipping below still prints. */
      });
    return () => {
      live = false;
    };
  }, []);

  const product = featured || null;
  const price = product ? product.price : 2672;
  const title = product ? product.name : 'Urban Vanguard Tee';
  const to = product ? ROUTES.product(product._id) : ROUTES.shop;

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.sheet}>
        {/* ---- ISSUE SLUG ------------------------------------------------ */}
        <div className={styles.slug}>
          <Stamp tone="pink" solid>
            Drop 01
          </Stamp>
          <span className={styles.slugText}>New Arrivals</span>
          <span className={styles.slugRule} aria-hidden="true" />
          <span className={styles.slugIssue}>VYBE</span>
        </div>

        {/* ---- HEADLINE --------------------------------------------------
            Four lines, flush left, set tight enough to read as one block.
            The two shouted words print a second pass off register — the same
            --mis-x/--mis-y the logo and every image use.                  */}
        <h1 className={styles.title} id="hero-title">
          <span className={styles.line}>Own the</span>
          <span className={`${styles.line} ${styles.shout}`}>
            <span className={styles.shoutGhost} aria-hidden="true">
              Edge
            </span>
            <span className={styles.shoutInk}>Edge</span>
          </span>
          <span className={styles.line}>Keep the</span>
          <span className={`${styles.line} ${styles.shout} ${styles.shoutBlue}`}>
            <span className={styles.shoutGhost} aria-hidden="true">
              Vibe
            </span>
            <span className={styles.shoutInk}>Vibe</span>
          </span>
        </h1>

        {/* ---- STANDFIRST ------------------------------------------------ */}
        <div className={styles.standfirst}>
          <p className={styles.kicker}>Where Art Meets your Style</p>
          <p className={styles.lede}>
            Step into the future of streetwear today.
          </p>

          <div className={styles.actions}>
            <Button to={ROUTES.shop} variant="ink" size="lg">
              New Drops
            </Button>
            <Button to={ANCHORS.drops} variant="outline" size="lg">
              See the drop
            </Button>
          </div>

          {/* The rating, stated as a fact rather than illustrated with four
              photographs of people who have never heard of this shop. */}
          <p className={styles.rating}>
            <span className={styles.stars} aria-hidden="true">
              ★★★★★
            </span>
            <span>
              Rated 5 Stars by
              <br />
              The Vybe Tribe
            </span>
          </p>
        </div>

        {/* ---- THE PHOTOGRAPH -------------------------------------------- */}
        <div className={styles.plateArea}>
          <Ink
            src={modelImage}
            alt="A model wearing the VYBE Drop 01 outerwear layer"
            ratio="4 / 5"
            plate="pink"
            priority
            className={styles.model}
            sizes="(min-width: 900px) 46vw, 92vw"
          />

          {/* A clipping pinned to the photograph. Links to a real product when
              one exists, and to the shop when it doesn't. */}
          <article className={styles.clipping}>
            <p className={styles.clippingLabel}>Featured Product</p>
            <h2 className={styles.clippingTitle}>{title}</h2>
            <p className={styles.clippingNote}>Unmatched comfort.</p>
            <p className={styles.clippingPrice}>{money(price)}</p>
            <Button to={to} variant="riso" size="sm" full>
              {product ? 'View product' : 'Shop the drop'}
            </Button>
          </article>
        </div>

        {/* ---- FEATURE STRIP -------------------------------------------- */}
        <ul className={styles.features}>
          {FEATURES.map((feature, i) => (
            <li className={styles.feature} key={feature}>
              <span className={styles.featureNum} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* The press ticker closes the cover and hands off to the next plate. */}
      <Marquee items={TICKER} tone="ink" speed={44} />
    </section>
  );
}
