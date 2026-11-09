import { Link } from 'react-router-dom';
import { ArrowRight, Award, BadgeCheck, ShieldCheck } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import Tag from '../components/ui/Tag';
import useDataState from '../hooks/useDataState';
import { api } from '../api/client';
import styles from './CredentialsPage.module.css';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function CredentialsSkeleton() {
  return (
    <ul className={styles.grid}>
      {[0, 1, 2].map((i) => (
        <li key={i} className={styles.skeletonCard}>
          <Skeleton height={48} width={48} radius={14} />
          <Skeleton height={16} width="70%" />
          <Skeleton height={12} width="55%" />
          <Skeleton height={44} width="100%" radius={8} style={{ marginTop: 'auto' }} />
        </li>
      ))}
    </ul>
  );
}

export default function CredentialsPage() {
  const state = useDataState(
    async () => {
      const data = await api.get('/certificates');
      return Array.isArray(data) ? data : [];
    },
    [],
  );
  const certificates = state.data || [];

  let body;
  if (state.status === 'loading') {
    body = (
      <SkeletonStatus label="Loading credentials...">
        <CredentialsSkeleton />
      </SkeletonStatus>
    );
  } else if (state.status === 'error') {
    body = <ErrorState title="Could not load credentials" error={state.error} onRetry={state.reload} />;
  } else if (certificates.length === 0) {
    body = (
      <EmptyState
        title="No credentials yet"
        description="Complete a course from a provider that offers certificates and it will appear here."
      />
    );
  } else {
    body = (
      <ul className={styles.grid} aria-label="Issued certificates">
        {certificates.map((certificate) => (
          <li key={certificate.certificateId} className={styles.card}>
            <span className={styles.icon} aria-hidden="true"><Award size={22} /></span>
            <div>
              <Tag variant="good"><BadgeCheck size={12} aria-hidden="true" /> Verified</Tag>
            </div>
            <h2 className={styles.courseName}>{certificate.courseName}</h2>
            <p className={styles.meta}>
              Issued by {certificate.providerName} · {formatDate(certificate.issuedAt)}
            </p>
            <p className={styles.serial}>Credential ID: {certificate.serialNumber}</p>
            <div className={styles.actions}>
              <Link className={styles.link} to={`/credentials/${certificate.certificateId}`}>
                View certificate <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                className={styles.link}
                to={`/verify/${encodeURIComponent(certificate.serialNumber)}`}
                aria-label={`Verify ${certificate.courseName} certificate`}
              >
                <ShieldCheck size={15} aria-hidden="true" /> Verify
              </Link>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Your portable record</p>
        <h1 className={styles.title}>Credentials</h1>
        <p className={styles.subtitle}>
          A long-term record of the skills you can show, not just claim.
        </p>
      </div>
      {body}
    </div>
  );
}
