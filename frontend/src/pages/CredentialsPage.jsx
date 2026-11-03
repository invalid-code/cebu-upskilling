import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BadgeCheck } from 'lucide-react';
import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import Tag from '../components/ui/Tag';
import Button from '../components/ui/Button';
import { api } from '../api/client';
import { eyebrow, headingRow, pageSubtitle, pageTitle } from '../styles/shared';

const styles = {
  heading: { ...headingRow },
  eyebrow: { ...eyebrow },
  h1: { ...pageTitle },
  subtitle: { ...pageSubtitle },
  list: { display: 'grid', gap: 14 },
  card: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'var(--good-soft)',
    color: 'var(--good)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 220 },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 17,
    fontWeight: 700,
    margin: '6px 0 4px',
  },
  meta: { fontSize: 13, color: 'var(--muted)', margin: '2px 0' },
  serial: { fontSize: 12, color: 'var(--muted)', marginTop: 6 },
};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function CredentialsPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/certificates')
      .then((data) => {
        if (active) setCertificates(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load credentials');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Your portable record</div>
          <h1 style={styles.h1}>Credentials</h1>
          <p style={styles.subtitle}>
            A long-term record of the skills you can show, not just claim.
          </p>
        </div>
      </div>

      <Panel>
        {loading ? (
          <SkeletonStatus label="Loading credentials...">
            {[0, 1].map((i) => (
              <div key={i} style={{ ...styles.card, marginBottom: 14 }}>
                <Skeleton height={48} width={48} radius={12} />
                <div style={{ flex: 1 }}>
                  <Skeleton height={14} width="45%" style={{ marginBottom: 8 }} />
                  <Skeleton height={12} width="65%" />
                </div>
                <Skeleton height={42} width={150} radius={10} />
              </div>
            ))}
          </SkeletonStatus>
        ) : error ? (
          <EmptyState title="Could not load credentials" description={error} />
        ) : certificates.length === 0 ? (
          <EmptyState
            title="No credentials yet"
            description="Complete a course from a provider that offers certificates and it will appear here."
          />
        ) : (
          <div style={styles.list}>
            {certificates.map((certificate) => (
              <div key={certificate.certificateId} style={styles.card}>
                <div style={styles.icon}>
                  <Award size={22} />
                </div>
                <div style={styles.body}>
                  <Tag variant="good"><BadgeCheck size={12} /> Verified</Tag>
                  <div style={styles.title}>{certificate.courseName}</div>
                  <p style={styles.meta}>
                    Issued by {certificate.providerName} · {formatDate(certificate.issuedAt)}
                  </p>
                  <p style={styles.serial}>Credential ID: {certificate.serialNumber}</p>
                </div>
                <Link to={`/credentials/${certificate.certificateId}`} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary">
                    View certificate <ArrowRight size={15} />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
