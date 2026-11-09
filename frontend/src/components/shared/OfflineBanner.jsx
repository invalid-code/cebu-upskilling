import { WifiOff } from 'lucide-react';
import Button from '../ui/Button';
import { useOfflineStore } from '../../stores/offlineStore';
import { retryOffline } from '../../api/offlineRetry';
import styles from './OfflineBanner.module.css';

// Shown while a request has failed with a network error. Removed as soon as a
// retry succeeds. After the automatic retries are exhausted it stays visible
// with an inline error and a manual retry control. Unsaved form input is never
// touched: this component only renders status.
export default function OfflineBanner() {
  const offline = useOfflineStore((s) => s.offline);
  const failed = useOfflineStore((s) => s.failed);
  const retrying = useOfflineStore((s) => s.retrying);

  if (!offline) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <WifiOff size={18} strokeWidth={1.75} aria-hidden="true" />
      <div className={styles.text}>
        <strong>You&apos;re offline</strong>
        {failed && (
          <p className={styles.error} role="alert">
            We couldn&apos;t reconnect. Your changes are still on this page.
          </p>
        )}
      </div>
      {failed && (
        <Button variant="ghost" onClick={retryOffline} disabled={retrying}>
          Retry
        </Button>
      )}
    </div>
  );
}
