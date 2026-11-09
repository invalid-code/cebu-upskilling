import { Children, cloneElement, isValidElement } from 'react';

const styles = {
  root: { display: 'grid', gap: 6, width: '100%' },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--ink)' },
  hint: { fontSize: 13, color: 'var(--muted)', margin: 0 },
  error: { fontSize: 13, color: 'var(--danger)', margin: 0 },
};

function joinIds(...ids) {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}

/**
 * Form field wrapper: visible label, optional hint, inline error.
 *
 * The control (`children`, a single element, or a function receiving the
 * control props) gets `id`, `aria-describedby` (hint and error ids) and
 * `aria-invalid`. Error state is derived directly from the `error` prop, so
 * the error text and `aria-invalid` are removed in the same render in which
 * the caller reports the value as valid (well within 200 ms).
 */
export default function Field({ id, label, hint, error, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const invalid = Boolean(error);

  const controlProps = {
    id,
    'aria-invalid': invalid ? 'true' : undefined,
  };

  let control;
  if (typeof children === 'function') {
    control = children({ ...controlProps, 'aria-describedby': joinIds(hintId, errorId) });
  } else {
    const only = Children.toArray(children);
    control = only.map((child) =>
      isValidElement(child) && typeof child.type !== 'symbol'
        ? cloneElement(child, {
            ...controlProps,
            'aria-describedby': joinIds(child.props['aria-describedby'], hintId, errorId),
          })
        : child,
    );
  }

  return (
    <div style={styles.root}>
      <label htmlFor={id} style={styles.label}>
        {label}
      </label>
      {control}
      {hint ? (
        <p id={hintId} style={styles.hint}>
          {hint}
        </p>
      ) : null}
      {invalid ? (
        <p id={errorId} role="alert" style={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
