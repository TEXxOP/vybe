/**
 * Drop schedule.
 *
 * Pulled out of LimitedEdition.jsx for two reasons: exporting non-components
 * from a component module breaks Vite's fast refresh, and these are pure
 * functions of the clock, which makes them the kind of thing that belongs in
 * lib/ where it can be reasoned about on its own.
 *
 * The previous build had no schedule at all. Its countdown was seeded with a
 * hardcoded `{ days: 2, hours: 13, minutes: 22, seconds: 45 }` and decremented
 * from there, so it restarted at two days and thirteen hours on every single
 * page load — forever. A countdown that resets when you refresh is not a
 * countdown, it's a decoration that lies.
 */

/** Drops land Friday at 20:00, local time. The one place to change it. */
export const DROP_DAY = 5; // 0 = Sunday … 5 = Friday
export const DROP_HOUR = 20;

/**
 * The next drop moment at or after `from`.
 *
 * Pure, so it can be called on every tick instead of holding a target in
 * state. That's what lets the clock roll over to the following Friday by
 * itself the instant it reaches zero, with no special-case branch — and it
 * can't drift, because nothing accumulates.
 */
export function nextDropAt(from = new Date()) {
  const target = new Date(from);
  target.setHours(DROP_HOUR, 0, 0, 0);

  let days = (DROP_DAY - target.getDay() + 7) % 7;
  // Drop day, but the hour has already passed: it's next week's.
  if (days === 0 && target <= from) days = 7;

  target.setDate(target.getDate() + days);
  return target;
}

/** Whole days/hours/minutes/seconds in a millisecond span, floored at zero. */
export function splitRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Milliseconds until the next drop, from now. */
export const msToNextDrop = () => nextDropAt() - Date.now();
