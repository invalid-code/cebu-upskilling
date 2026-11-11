import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { api } from '../api/client';
import EmptyState from '../components/shared/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import styles from './VerifyCertificatePage.module.css';

export const VERIFY_TIMEOUT_MS = 10000;

const ERROR_MESSAGE = 'Verification could not be completed. Check your connection and try again.';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Public certificate verification (outside the Shell, no auth).
 * States: loading -> result | notfound (404) | error (network error, >10s timeout, 5xx).
 */
export default function VerifyCertificatePage() {
  const { serialNumber } = useParams();
  const [state, setState] = useState({ status: 'loading', certificate: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let finished = false;
    const timer = setTimeout(() => {
      controller.abort();
    }, VERIFY_TIMEOUT_MS);

    const settle = (next) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      setState(next);
    };

    setState({ status: 'loading', certificate: null });
    api
      .get(`/certificates/verify/${encodeURIComponent(serialNumber)}`, { signal: controller.signal, bypassCache: true })
      .then((data) => {
        if (data && typeof data === 'object') settle({ status: 'result', certificate: data });
        else settle({ status: 'error', certificate: null });
      })
      .catch((err) => {
        // 404 is the only "not available" case; network errors (status 0), timeouts (abort) and 5xx all show the retryable error.
        settle({ status: err?.status === 404 ? 'notfound' : 'error', certificate: null });
      });

    return () => {
      finished = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [serialNumber, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const { status, certificate } = state;

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand}>Cebu Upskilling</Link>
      </header>
      <main className={styles.content} id="main-content">
        {status === 'loading' && (
          <SkeletonStatus label="Verifying certificate..." minHeight={220}>
            <div className={styles.card}>
              <Skeleton height={28} width="55%" style={{ marginBottom: 16 }} />
              <Skeleton height={14} width="80%" style={{ marginBottom: 10 }} />
              <Skeleton height={14} width="65%" style={{ marginBottom: 10 }} />
              <Skeleton height={14} width="70%" />
            </div>
          </SkeletonStatus>
        )}

        {status === 'result' && (
          <section className={styles.card} aria-labelledby="verify-heading">
            <h1 id="verify-heading" className={styles.heading}>Certificate verified</h1>
            <p className={styles.verified}>
              <BadgeCheck size={18} aria-hidden="true" /> This certificate is authentic
            </p>
            <dl className={styles.details}>
              <dt>Recipient</dt>
              <dd>{certificate.recipientName}</dd>
              <dt>Course</dt>
              <dd>{certificate.courseName}</dd>
              <dt>Provider</dt>
              <dd>{certificate.providerName}</dd>
              <dt>Issued</dt>
              <dd>{formatDate(certificate.issuedAt)}</dd>
              <dt>Serial number</dt>
              <dd className={styles.serial}>{certificate.serialNumber}</dd>
            </dl>
          </section>
        )}

        {status === 'notfound' && (
          <EmptyState
            title="Certificate not available"
            description="This certificate is not available. Check the serial number and try again."
          >
            <Link to="/" className={styles.homeLink}>Go to CebuUpskilling home</Link>
          </EmptyState>
        )}

        {status === 'error' && (
          <ErrorState title="Verification failed" error={ERROR_MESSAGE} onRetry={retry} />
        )}
      </main>
    </div>
  );
}
