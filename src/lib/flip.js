/**
 * FLIP shared-element transitions, without a dependency.
 *
 * When you tap a product card in the shop grid, the card's image should
 * *become* the product page's hero image rather than the grid disappearing and
 * a new page appearing. That continuity is most of what "seamless" means.
 *
 * The technique is FLIP — First, Last, Invert, Play:
 *   1. Before navigating, record the card's rect (First).
 *   2. Let React render the destination normally (Last).
 *   3. Apply a transform that maps the destination back onto the origin rect
 *      so it *looks* like nothing moved (Invert).
 *   4. Animate that transform away (Play).
 *
 * Implemented with the Web Animations API rather than CSS transitions, so it
 * can't be tangled up in the cascade or cancelled by an unrelated class change.
 */

import { useLayoutEffect, useRef } from 'react';

const origins = new Map();

// If the user takes longer than this between click and arrival, the animation
// would feel disconnected from their action, so we skip it.
const MAX_AGE_MS = 1200;

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Record where an element is, just before navigating away from it.
 * Call from the click handler on the source element.
 */
export function rememberOrigin(key, el) {
  if (!key || !el || reducedMotion()) return;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  origins.set(String(key), {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    at: performance.now(),
  });
}

export function clearOrigin(key) {
  origins.delete(String(key));
}

/**
 * Attach to the destination element. On mount, if we have a matching origin
 * rect, the element flies from there to its real position.
 *
 *   const ref = useFlipArrival(product?._id);
 *   <div ref={ref}>…</div>
 */
export function useFlipArrival(key, { duration = 520 } = {}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !key) return;

    const origin = origins.get(String(key));
    if (!origin) return;
    origins.delete(String(key));

    if (reducedMotion()) return;
    if (performance.now() - origin.at > MAX_AGE_MS) return;
    if (typeof el.animate !== 'function') return; // ancient browser, no harm done

    const dest = el.getBoundingClientRect();
    if (dest.width === 0 || dest.height === 0) return;

    const dx = origin.left - dest.left;
    const dy = origin.top - dest.top;
    const sx = origin.width / dest.width;
    const sy = origin.height / dest.height;

    // Nothing meaningful to animate.
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(sx - 1) < 0.02) return;

    el.animate(
      [
        {
          transformOrigin: 'top left',
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        },
        {
          transformOrigin: 'top left',
          transform: 'none',
        },
      ],
      {
        duration,
        // Matches --ease-out in tokens.css.
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'none',
      }
    );
  }, [key, duration]);

  return ref;
}

/**
 * Cross-document-style route transitions where the browser supports the View
 * Transitions API (Chrome/Edge, Safari 18+), and a plain no-op everywhere
 * else. Progressive enhancement — never required for navigation to work.
 */
export function withViewTransition(fn) {
  if (
    typeof document === 'undefined' ||
    typeof document.startViewTransition !== 'function' ||
    reducedMotion()
  ) {
    fn();
    return;
  }
  document.startViewTransition(fn);
}
