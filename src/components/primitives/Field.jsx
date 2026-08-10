import { useId } from 'react';
import styles from './Field.module.css';

/**
 * FIELD — a form control that is actually labelled.
 *
 * The audit found form labelling "systematically broken" across the previous
 * build: placeholders standing in for labels, labels not associated with their
 * inputs, no programmatic error association, no aria-invalid. That's the single
 * most common way a checkout becomes unusable with a screen reader — and
 * checkout is where it costs money.
 *
 * This wires up, every time and without the caller having to remember:
 *   · a real <label for> / id pair via useId()
 *   · aria-describedby pointing at the hint and/or the error
 *   · aria-invalid when errored
 *   · role="alert" on the error so it's announced when it appears
 *   · required communicated visually AND as the required attribute
 *
 * Placeholders are still allowed, but only ever as an *example* of the format
 * — never as the field's name.
 */
export default function Field({
  label,
  name,
  type = 'text',
  as = 'input',
  hint,
  error,
  required = false,
  options,
  className = '',
  children,
  ...rest
}) {
  const uid = useId();
  const id = `${name || 'field'}-${uid}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const shared = {
    id,
    name,
    required,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    className: styles.control,
    ...rest,
  };

  return (
    <div
      className={[styles.field, error ? styles.hasError : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="visuallyHidden">(required)</span> : null}
      </label>

      {as === 'select' ? (
        <div className={styles.selectWrap}>
          <select {...shared}>
            {options
              ? options.map((opt) => {
                  const value = typeof opt === 'string' ? opt : opt.value;
                  const text = typeof opt === 'string' ? opt : opt.label;
                  return (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  );
                })
              : children}
          </select>
          <span className={styles.caret} aria-hidden="true">
            ▾
          </span>
        </div>
      ) : as === 'textarea' ? (
        <textarea rows={4} {...shared} />
      ) : (
        <input type={type} {...shared} />
      )}

      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
