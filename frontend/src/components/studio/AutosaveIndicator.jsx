import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import styles from './CourseStudio.module.css';

const TEXT = { saving: 'Saving', saved: 'Saved', failed: 'Save failed' };

/**
 * Autosave state as text ("Saving" / "Saved" / "Save failed") plus an icon.
 * `idle` on an already-persisted course reads "Saved"; before the first save nothing is shown.
 */
export default function AutosaveIndicator({ status, persisted }) {
  const shown = status === 'idle' ? (persisted ? 'saved' : null) : status;
  const className = [
    styles.autosave,
    shown === 'failed' ? styles.autosaveFailed : '',
    shown === 'saved' ? styles.autosaveSaved : '',
  ].filter(Boolean).join(' ');
  return (
    <div role="status" aria-live="polite" className={className} data-testid="autosave-indicator">
      {shown && (
        <>
          {shown === 'saving' && <Loader2 size={14} aria-hidden="true" style={{ animation: 'spin 0.9s linear infinite' }} />}
          {shown === 'saved' && <Check size={14} aria-hidden="true" />}
          {shown === 'failed' && <AlertTriangle size={14} aria-hidden="true" />}
          <span>{TEXT[shown]}</span>
        </>
      )}
    </div>
  );
}
