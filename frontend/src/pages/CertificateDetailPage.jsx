import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, BadgeCheck, Printer } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import EmptyState from '../components/shared/EmptyState';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import { api } from '../api/client';
import { eyebrow, pageSubtitle } from '../styles/shared';

const styles = {
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    fontWeight: 700,
    fontSize: 13,
  },
  heading: { marginBottom: 24 },
  eyebrow: { ...eyebrow },
  h1: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
    margin: '0 0 8px',
  },
  subtitle: { ...pageSubtitle },
  sheet: {
    border: '2px solid var(--teal)',
    borderRadius: 18,
    padding: 'clamp(28px, 5vw, 56px)',
    textAlign: 'center',
    background: 'var(--surface)',
    position: 'relative',
    overflow: 'hidden',
  },
  seal: {
    width: 62,
    height: 62,
    borderRadius: '50%',
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    display: 'grid',
    placeItems: 'center',
    margin: '0 auto 18px',
  },
  kicker: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontWeight: 800,
    color: 'var(--muted)',
    marginBottom: 10,
  },
  course: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
    lineHeight: 1.15,
    margin: '0 auto 18px',
    maxWidth: 620,
  },
  certifies: { fontSize: 14, color: 'var(--muted)', margin: '0 0 8px' },
  name: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.4rem, 2.6vw, 2rem)',
    margin: '0 0 18px',
  },
  copy: {
    fontSize: 14,
    lineHeight: 1.65,
    color: 'var(--muted)',
    maxWidth: 560,
    margin: '0 auto 26px',
  },
  meta: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
    fontSize: 12,
    color: 'var(--muted)',
    marginBottom: 18,
  },
  serial: {
    fontFamily: 'monospace',
    fontSize: 13,
    letterSpacing: '0.08em',
    fontWeight: 700,
    color: 'var(--ink)',
  },
  provider: { fontSize: 13, fontWeight: 700, color: 'var(--teal)' },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
  },
};

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
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/certificates/${certificateId}`)
      .then((data) => {
        if (active) setCertificate(data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load certificate');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [certificateId]);

  return (
    <div className="view-enter">
      <Link to="/credentials" style={styles.back}>
        <ArrowLeft size={15} /> Back to credentials
      </Link>

      {loading ? (
        <SkeletonStatus label="Loading certificate...">
          <Panel>
            <Skeleton height={62} width={62} radius={31} style={{ margin: '0 auto 18px' }} />
            <Skeleton height={28} width="70%" radius={8} style={{ margin: '0 auto 14px' }} />
            <Skeleton height={14} width="45%" style={{ margin: '0 auto 10px' }} />
            <Skeleton height={56} width="80%" radius={10} style={{ margin: '0 auto' }} />
          </Panel>
        </SkeletonStatus>
      ) : error || !certificate ? (
        <Panel>
          <EmptyState title="Certificate unavailable" description={error || 'This certificate could not be found.'} />
        </Panel>
      ) : (
        <>
          <div style={styles.heading}>
            <div style={styles.eyebrow}>Verified achievement</div>
            <h1 style={styles.h1}>Certificate</h1>
            <p style={styles.subtitle}>
              Issued by the course provider when you completed the course.
            </p>
          </div>

          <Panel style={{ background: 'transparent', padding: 0, border: 0, boxShadow: 'none' }}>
            <div className="certificate-sheet" style={styles.sheet}>
              <div style={styles.seal}>
                <Award size={32} />
              </div>
              <div style={styles.kicker}>Certificate of completion</div>
              <h2 style={styles.course}>{certificate.courseName}</h2>
              <p style={styles.certifies}>This certifies that</p>
              <div style={styles.name}>{certificate.recipientName}</div>
              <p style={styles.copy}>
                has successfully completed the course and met all completion requirements.
              </p>
              <div style={styles.meta}>
                <span><BadgeCheck size={13} /> Verified</span>
                <span>Issued {formatDate(certificate.issuedAt)}</span>
              </div>
              <div style={styles.serial}>Credential ID: {certificate.serialNumber}</div>
              <div style={{ ...styles.provider, marginTop: 14 }}>{certificate.providerName}</div>
            </div>
          </Panel>

          <div className="certificate-actions" style={styles.actions}>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print or save as PDF
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
