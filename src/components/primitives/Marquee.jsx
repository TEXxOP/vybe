import styles from './Marquee.module.css';

/**
 * MARQUEE — the press ticker.
 *
 * A running strip of type, the way a drop announcement gets stencilled across
 * the top of a flyer. The content is duplicated so the loop is seamless; the
 * duplicate is aria-hidden so screen readers hear the message once, not twice.
 *
 * Under prefers-reduced-motion the animation stops and it becomes a static
 * strip (see Marquee.module.css) — the message still reads, it just holds
 * still.
 */
export default function Marquee({
  items = [],
  speed = 38,
  tone = 'ink',
  separator = '✳',
}) {
  if (!items.length) return null;

  const run = (
    <span className={styles.run}>
      {items.map((item, i) => (
        <span className={styles.item} key={`${item}-${i}`}>
          {item}
          <span className={styles.sep} aria-hidden="true">
            {separator}
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div
      className={[styles.marquee, styles[tone] || styles.ink].join(' ')}
      style={{ '--speed': `${speed}s` }}
    >
      <div className={styles.track}>
        {run}
        <span aria-hidden="true">{run}</span>
      </div>
    </div>
  );
}
