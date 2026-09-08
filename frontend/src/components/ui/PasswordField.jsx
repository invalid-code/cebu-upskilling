import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password input with eye toggle.
 * Restrained design: icon sits inside the field, uses var(--muted) and small hit area.
 */
export default function PasswordField({
  value,
  onChange,
  placeholder,
  style,
  autoComplete,
  id,
  disabled,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  ...rest
}) {
  const [visible, setVisible] = useState(false);

  const hasError = !!ariaInvalid;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Firefox has no native reveal eye (only Edge/IE and Chrome do), so there is
          no -moz- selector to suppress. Extension-injected icons (password
          managers) render outside page CSS and are intentionally left alone. */}
      <style>{`input[type="password"]::-ms-reveal,input[type="password"]::-ms-clear,input[type="password"]::-webkit-credentials-auto-fill-button,input[type="password"]::-webkit-textfield-decoration-container{display:none !important;visibility:hidden !important;}`}</style>
      <input
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        style={{
          ...style,
          paddingRight: 42,
        }}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={0}
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 30,
          height: 30,
          borderRadius: 7,
          border: 'none',
          background: 'transparent',
          color: hasError ? 'var(--danger)' : 'var(--muted)',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  );
}
