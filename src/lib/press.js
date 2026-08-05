/**
 * THE SIGNATURE ELEMENT — two-pass ink misregistration.
 *
 * On a risograph, each colour is a separate pass through the drum. If the
 * paper shifts even slightly between passes, the plates don't line up and you
 * get misregistration: a coloured ghost peeking out from behind the black.
 * Printers hate it. Zine makers learned to love it.
 *
 * Here it's driven by scroll *velocity*. At rest the plates sit a hair apart
 * (--misregister-rest). Scroll hard and they separate; stop and they spring
 * back and settle. The page reads as if it's still coming off the press.
 *
 * IMPLEMENTATION NOTE — why this is one module-level rAF loop writing two
 * CSS custom properties on <html>, rather than a hook per component:
 *
 *   The previous build had three unthrottled scroll listeners and two
 *   MutationObservers on document.body with subtree:true. Every component
 *   that wanted motion added its own listener.
 *
 *   Instead: ONE passive scroll listener wakes ONE rAF loop, which writes
 *   --mis-x / --mis-y / --mis-a. Any number of elements can then read those
 *   in CSS for free, because custom property changes on the root are handled
 *   by the compositor for transform/opacity. Cost is O(1) in components.
 *
 * The loop also parks itself. When the spring has settled and nothing is
 * scrolling, rAF is cancelled entirely and only the passive listener remains.
 */

const REST = 2; // px — must match --misregister-rest
const MAX = 14; // px — must match --misregister-max

// Velocity (px/ms) is multiplied by this to get a target offset in px.
const VELOCITY_GAIN = 7.5;

// Spring constants. Deliberately asymmetric: quick to separate, slow to
// settle, which is what makes it feel like wet ink rather than a slider.
const STIFFNESS_ATTACK = 0.26;
const STIFFNESS_RELEASE = 0.11;
const DAMPING = 0.76;

// Frames the spring must sit still before we park the rAF loop.
const IDLE_FRAMES = 20;

let started = false;
let rafId = null;
let idleFrames = 0;

let lastY = 0;
let lastT = 0;
let target = REST;
let offset = REST;
let velocity = 0;
let direction = 1; // +1 scrolling down, -1 scrolling up

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function write(x, y, amount) {
  const root = document.documentElement;
  root.style.setProperty('--mis-x', `${x.toFixed(2)}px`);
  root.style.setProperty('--mis-y', `${y.toFixed(2)}px`);
  root.style.setProperty('--mis-a', amount.toFixed(3));
}

function frame(now) {
  const dt = Math.min(now - lastT, 50) || 16;
  lastT = now;

  // Decay the target back toward rest so that merely holding still relaxes it.
  target += (REST - target) * 0.12;

  const stiffness = target > offset ? STIFFNESS_ATTACK : STIFFNESS_RELEASE;
  velocity += (target - offset) * stiffness;
  velocity *= DAMPING;
  offset += velocity;

  // The plate shears along the scroll axis, with a smaller lateral component
  // so it reads as a physical skew rather than a straight vertical slip.
  const y = offset * direction;
  const x = offset * 0.42 * direction;

  // Normalised 0..1 amount, for opacity/blend strength in CSS.
  const amount = Math.max(0, Math.min(1, (offset - REST) / (MAX - REST)));

  write(x, y, amount);

  const settled =
    Math.abs(offset - REST) < 0.06 && Math.abs(velocity) < 0.06 && dt > 0;

  if (settled) {
    idleFrames += 1;
    if (idleFrames > IDLE_FRAMES) {
      // Park. The scroll listener will wake us.
      offset = REST;
      velocity = 0;
      write(REST * direction * 0.42, REST * direction, 0);
      rafId = null;
      return;
    }
  } else {
    idleFrames = 0;
  }

  rafId = requestAnimationFrame(frame);
}

function wake() {
  if (rafId === null) {
    lastT = performance.now();
    idleFrames = 0;
    rafId = requestAnimationFrame(frame);
  }
}

function onScroll() {
  const y = window.scrollY;
  const now = performance.now();
  const dt = now - lastT || 16;
  const dy = y - lastY;

  if (dy !== 0) direction = dy > 0 ? 1 : -1;

  const v = Math.abs(dy) / dt; // px per ms
  const next = REST + Math.min(v * VELOCITY_GAIN, MAX - REST);
  if (next > target) target = next;

  lastY = y;
  wake();
}

/**
 * Start the press. Call once, from the app shell.
 * Returns a teardown function.
 */
export function startPress() {
  if (started || typeof window === 'undefined') return () => {};
  started = true;

  if (prefersReducedMotion()) {
    // Locked, static misregistration. Still on-brand — a printed object with
    // one bad pass — but nothing moves.
    write(REST * 0.42, REST, 0);
    return () => {
      started = false;
    };
  }

  lastY = window.scrollY;
  lastT = performance.now();
  write(REST * 0.42, REST, 0);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', wake, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', wake);
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    started = false;
  };
}
