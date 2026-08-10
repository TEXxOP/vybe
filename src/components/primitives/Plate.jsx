import styles from './Plate.module.css';

/**
 * PLATE — a section of the press run.
 *
 * The homepage is a printed sequence, so its sections are numbered plates.
 * The margin label states the plate's position in the run and which ink it
 * uses: that's true information about the object, which is the test a
 * structural device has to pass before it earns a place on the page.
 *
 * Also provides the anchor target that the header nav scrolls to. The
 * previous build's /#collections, /#about and /#contact links were defeated by
 * a ScrollToTop effect that fired on every pathname change; here the anchors
 * are real ids and html{scroll-padding-top} clears the fixed header.
 */
export default function Plate({
  id,
  index,
  ink = 'ink',
  label,
  tone = 'paper',
  bleed = false,
  as: Tag = 'section',
  className = '',
  children,
  ...rest
}) {
  const marginLabel =
    label || [index != null ? `Plate ${String(index).padStart(2, '0')}` : null, ink]
      .filter(Boolean)
      .join(' · ');

  return (
    <Tag
      id={id}
      className={[
        styles.plate,
        styles[tone] || styles.paper,
        bleed ? styles.bleed : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {/* Registration furniture. Decorative, so hidden from the a11y tree. */}
      <span className={styles.cropTL} aria-hidden="true" />
      <span className={styles.cropTR} aria-hidden="true" />
      <span className={styles.cropBL} aria-hidden="true" />
      <span className={styles.cropBR} aria-hidden="true" />

      <span className={styles.marginLabel} aria-hidden="true">
        {marginLabel}
      </span>

      <div className={bleed ? styles.innerBleed : styles.inner}>{children}</div>
    </Tag>
  );
}
