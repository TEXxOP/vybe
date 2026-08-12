import { useReveal } from '../../lib/useReveal';

/**
 * Declarative wrapper around the single reveal system.
 *
 *   <Reveal variant="up" delay={130}><Thing /></Reveal>
 *
 * The animation itself is defined once in styles/global.css against
 * [data-reveal]; this only decides which variant and when.
 */
export default function Reveal({
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
  className = '',
  style,
  children,
  ...rest
}) {
  const ref = useReveal();

  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal={variant}
      style={delay ? { ...style, '--reveal-delay': `${delay}ms` } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
