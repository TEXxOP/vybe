import { useState } from 'react';
import styles from './Ink.module.css';

/**
 * INK — the signature element.
 *
 * Every image on the site prints in two passes. The ink plate is the
 * photograph. Behind it, offset, sits a solid riso colour block — the second
 * pass, laid down a fraction out of register. lib/press.js drives that offset
 * from scroll velocity, so the block separates as you move and springs back
 * when you stop.
 *
 * Two deliberate engineering choices:
 *
 * 1. The offset lives in --mis-x / --mis-y on <html>, written once per frame
 *    by a single rAF loop. Every Ink on the page reads the same two custom
 *    properties, so adding images costs nothing. Only `translate` is animated.
 *
 * 2. onError is handled. The previous build set `img { opacity: 0 }` globally
 *    and only ever listened for `load`, so any failed image — a hotlink-blocked
 *    Unsplash URL, the dead via.placeholder.com fallbacks, a bad admin URL —
 *    rendered as an invisible element and left a blank hole in the layout.
 *    Here a failure prints a visible "plate missing" slug instead.
 */
export default function Ink({
  src,
  alt = '',
  ratio = '3 / 4',
  plate = 'pink',
  priority = false,
  taped = false,
  className = '',
  sizes,
  children,
}) {
  const [state, setState] = useState('loading');

  const plateClass =
    plate === 'orange' ? styles.plateOrange
      : plate === 'blue' ? styles.plateBlue
      : plate === 'none' ? styles.plateNone
      : styles.platePink;

  return (
    <figure
      className={[
        styles.ink,
        plateClass,
        taped ? styles.taped : '',
        state === 'error' ? styles.errored : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{ '--ratio': ratio }}
    >
      {/* Second pass — the misregistered colour block. Decorative. */}
      <span className={styles.plate} aria-hidden="true" />

      {state === 'error' ? (
        <span className={styles.missing} role="img" aria-label={alt || 'Image unavailable'}>
          <span className={styles.missingMark}>✕</span>
          <span className={styles.missingText}>plate&nbsp;missing</span>
        </span>
      ) : (
        <img
          className={styles.image}
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          draggable="false"
          data-loaded={state === 'loaded' ? 'true' : 'false'}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
        />
      )}

      {children ? <figcaption className={styles.caption}>{children}</figcaption> : null}
    </figure>
  );
}
