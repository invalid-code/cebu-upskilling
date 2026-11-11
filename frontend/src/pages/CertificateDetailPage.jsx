import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, BadgeCheck, Printer } from 'lucide-react';
import Button from '../components/ui/Button';
import ErrorState from '../components/ui/ErrorState';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import useDataState from '../hooks/useDataState';
import { api } from '../api/client';
import styles from './CertificateDetailPage.module.css';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function CertificateDetailPage() {
  const { certificateId } = useParams();
  const state = useDataState(
    () => api.get(`/certificates/${certificateId}`),
    [certificateId],
  );
  const certificate = state.data;

  let body;
  if (state.status === 'loading') {
    body = (
      <SkeletonStatus label="Loading certificate...">
        <div className={styles.skeletonSheet}>
          <Skeleton height={64} width={64} radius={32} style={{ margin: '0 auto 18px' }} />
          <Skeleton height={28} width="70%" radius={8} style={{ margin: '0 auto 14px' }} />
          <Skeleton height={14} width="45%" style={{ margin: '0 auto 10px' }} />
          <Skeleton height={56} width="80%" radius={10} style={{ margin: '0 auto' }} />
        </div>
      </SkeletonStatus>
    );
  } else if (state.status === 'error' || !certificate) {
    body = (
      <ErrorState
        title="Certificate unavailable"
        error={state.error || 'This certificate could not be found.'}
        onRetry={state.reload}
      />
    );
  } else {
    body = (
      <>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Verified achievement</p>
          <h1 className={styles.title}>Certificate</h1>
          <p className={styles.subtitle}>Issued by the course provider when you completed the course.</p>
        </div>

        <article className={styles.sheet} aria-label="Certificate of completion">
          <div className={styles.seal} aria-hidden="true"><Award size={32} /></div>
          <p className={styles.kicker}>Certificate of completion</p>
          <h2 className={styles.course}>{certificate.courseName}</h2>
          <p className={styles.certifies}>This certifies that</p>
          <p className={styles.name}>{certificate.recipientName}</p>
          <p className={styles.copy}>
            has successfully completed the course and met all completion requirements.
          </p>
          <div className={styles.meta}>
            <span className={styles.metaItem}><BadgeCheck size={14} aria-hidden="true" /> Verified</span>
            <span>Issued {formatDate(certificate.issuedAt)}</span>
          </div>
          <p className={styles.serial}>Credential ID: {certificate.serialNumber}</p>
          <p className={styles.provider}>{certificate.providerName}</p>
        </article>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> Print or save as PDF
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className={`view-enter ${styles.page}`}>
      <Link to="/credentials" className={styles.back}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to credentials
      </Link>
      {body}
    </div>
  );
}
