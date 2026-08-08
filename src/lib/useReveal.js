/**
 * The one reveal system.
 *
 * The previous build had four overlapping ones: a MutationObserver-driven
 * scroll-reveal in usePageMotion.js, a hardcoded list of button selectors in
 * animations.css, per-component keyframes, and inline --reveal-delay vars.
 * They fought each other and produced duplicate @keyframes that silently
 * overwrote one another.
 *
 * This is a single shared IntersectionObserver. Elements opt in by rendering
 * with a [data-reveal] attribute; the observer flips [data-inview="true"] once
 * and then stops watching them. All the actual animation lives in
 * styles/global.css, so there is exactly one place to change it.
 */

import { useEffect, useRef } from 'react';

let observer = null;

function getObserver() {
  if (observer) return observer;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.dataset.inview = 'true';
        // Reveal is a one-shot. Unobserve so we stop paying for it.
        observer.unobserve(entry.target);
      }
    },
    {
      // Fire a little before the element is fully on screen, and don't wait
      // for tall elements to be substantially visible.
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.06,
    }
  );

  return observer;
}

/**
 * Attach to any element to reveal it on scroll.
 *
 *   const ref = useReveal();
 *   <div ref={ref} data-reveal="up">…</div>
 */
export function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // Respect the user before doing anything else.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.dataset.inview = 'true';
      return undefined;
    }

    // Already above the fold on load? Reveal on the next frame so the
    // transition still runs rather than snapping.
    const obs = getObserver();
    obs.observe(el);

    return () => obs.unobserve(el);
  }, []);

  return ref;
}

/**
 * Reveal a whole subtree with an automatic stagger, for sections where
 * hand-numbering delays would be noise. Every [data-reveal] descendant gets
 * a --reveal-delay derived from its index.
 */
export function useRevealGroup(step = 65) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    const targets = Array.from(root.querySelectorAll('[data-reveal]'));
    if (root.hasAttribute('data-reveal')) targets.unshift(root);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((el) => {
        el.dataset.inview = 'true';
      });
      return undefined;
    }

    targets.forEach((el, i) => {
      if (!el.style.getPropertyValue('--reveal-delay')) {
        el.style.setProperty('--reveal-delay', `${i * step}ms`);
      }
    });

    const obs = getObserver();
    targets.forEach((el) => obs.observe(el));

    return () => targets.forEach((el) => obs.unobserve(el));
  }, [step]);

  return ref;
}
