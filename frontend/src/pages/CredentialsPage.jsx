import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

const styles = {
  heading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 22,
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 700,
    color: 'var(--coral)',
    marginBottom: 12,
  },
  h1: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(2rem, 4vw, 3.3rem)',
  },
  subtitle: {
    color: 'var(--muted)',
    margin: '8px 0 0',
    maxWidth: 62,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
};

const credentials = [
  { name: 'React Fundamentals', status: 'verified', date: 'Proctored assessment · Jun 28, 2026' },
  { name: 'Professional Communication', status: 'verified', date: 'Proctored assessment · Jun 10, 2026' },
  { name: 'JavaScript Fundamentals', status: 'in-progress', date: 'Assessment available now' },
];

export default function CredentialsPage() {
  const { showToast } = useToast();

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

      <div style={styles.grid}>
        {credentials.map((cred) => (
          <Panel key={cred.name}>
            <Tag variant={cred.status === 'verified' ? 'good' : 'coral'}>
              {cred.status === 'verified' ? 'Verified' : 'In progress'}
            </Tag>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", marginTop: 13 }}>{cred.name}</h3>
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>{cred.date}</p>
            {cred.status === 'verified' ? (
              <Button variant="ghost" style={{ marginTop: 15 }}>View credential</Button>
            ) : (
              <Button variant="primary" style={{ marginTop: 15 }} onClick={() => showToast('Assessment flow opened')}>
                Take assessment
              </Button>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
