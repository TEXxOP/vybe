import styles from './Stamp.module.css';

/**
 * STAMP — the utility voice of the zine.
 *
 * Rubber-stamped mono type in a hard box. Used for anything that is a fact
 * rather than a claim: drop numbers, stock counts, plate names, statuses,
 * deadlines. Structural, not decorative — if a stamp doesn't encode real
 * information, it shouldn't be on the page.
 */
export default function Stamp({
  as: Tag = 'span',
  tone = 'ink',
  angle = 0,
  solid = false,
  className = '',
  style,
  children,
  ...rest
}) {
  return (
    <Tag
      className={[
        styles.stamp,
        styles[tone] || styles.ink,
        solid ? styles.solid : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={angle ? { ...style, '--angle': `${angle}deg` } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
