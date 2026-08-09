import { Link } from 'react-router-dom';
import styles from './Button.module.css';

/**
 * The one button.
 *
 * The previous build styled buttons from a hardcoded selector list in
 * animations.css — `.btn, .cta-btn, .add-to-cart, .checkout-btn, …` — which
 * meant any new button silently got no styling until someone remembered to
 * append it to that list. And `.btn-arrow` was defined in three files, with
 * import order deciding which won.
 *
 * Renders as <button>, <Link> or <a> depending on the props, so an action is
 * always the right element for what it does — never a styled <div>. The
 * previous build had twelve controls that looked clickable and did nothing.
 */
export default function Button({
  as,
  to,
  href,
  variant = 'ink',
  size = 'md',
  full = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const cls = [
    styles.btn,
    styles[variant] || styles.ink,
    styles[size] || styles.md,
    full ? styles.full : '',
    loading ? styles.loading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <>
      <span className={styles.label}>{children}</span>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a className={cls} href={href} {...rest}>
        {inner}
      </a>
    );
  }

  const Tag = as || 'button';
  return (
    <Tag
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {inner}
    </Tag>
  );
}
