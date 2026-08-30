import { useEffect } from 'react';
import { X } from 'lucide-react';

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20, 30, 25, 0.46)',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 18,
    maxWidth: 520,
    width: '100%',
    padding: 24,
    boxShadow: 'var(--shadow)',
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 14,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'transparent',
    color: 'var(--muted)',
    display: 'grid',
    placeItems: 'center',
    border: 0,
    cursor: 'pointer',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 18,
  },
};

export default function Modal({ open, onClose, eyebrow, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop open" style={styles.backdrop} onClick={onClose}>
      <div
        className="modal"
        style={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.head}>
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h3>{title}</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
        {footer && <div style={styles.actions}>{footer}</div>}
      </div>
    </div>
  );
}
