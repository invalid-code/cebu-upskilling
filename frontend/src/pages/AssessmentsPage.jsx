import { useState } from 'react';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { Camera, Mic, Maximize } from 'lucide-react';

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
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: 16,
  },
  col7: { gridColumn: 'span 7' },
  col5: { gridColumn: 'span 5' },
  notice: {
    padding: '12px 14px',
    borderRadius: 10,
    background: 'var(--coral-soft)',
    color: 'rgb(100, 75, 50)',
    fontSize: 12,
    marginTop: 15,
  },
  consent: {
    display: 'grid',
    gap: 10,
    margin: '18px 0',
  },
  consentItem: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    background: 'var(--surface2)',
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
  },
  gap: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 14,
    alignItems: 'center',
    borderBottom: '1px solid var(--line)',
    padding: '14px 0',
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  subtitle2: {
    fontSize: 11,
    color: 'var(--muted)',
  },
};

const recentResults = [
  { name: 'React fundamentals', date: 'Verified Jun 28', level: '4 Advanced' },
  { name: 'Communication', date: 'Verified Jun 10', level: '4 Advanced' },
];

export default function AssessmentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { showToast } = useToast();

  const handleStart = () => {
    setModalOpen(false);
    showToast('Device check ready. Your timer has not started.');
  };

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Proof that moves with you</div>
          <h1 style={styles.h1}>Assessments</h1>
          <p style={styles.subtitle}>
            Verified results strengthen your profile and your job match.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <Panel style={styles.col7}>
          <Tag variant="coral">Recommended next</Tag>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", marginTop: 13 }}>JavaScript fundamentals</h3>
          <p style={{ color: 'var(--muted)' }}>
            30 questions · 45 minutes · Proctored · Builds toward Advanced
          </p>
          <div style={styles.notice}>
            Your current level is 3 Intermediate. A verified result can move this skill into your job applications.
          </div>
          <Button variant="primary" style={{ marginTop: 17 }} onClick={() => setModalOpen(true)}>
            Start assessment
          </Button>
        </Panel>

        <Panel style={styles.col5}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recent results</h3>
          {recentResults.map((result) => (
            <div key={result.name} style={styles.gap}>
              <div>
                <h4 style={styles.title}>{result.name}</h4>
                <small style={styles.subtitle2}>{result.date}</small>
              </div>
              <Tag variant="good">{result.level}</Tag>
            </div>
          ))}
        </Panel>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        eyebrow="Before the timer starts"
        title="JavaScript fundamentals"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Not now</Button>
            <Button variant="primary" onClick={handleStart}>Continue to device check</Button>
          </>
        }
      >
        <p style={{ color: 'var(--muted)' }}>
          This assessment uses a few permissions to verify the session. We only use them for this attempt.
        </p>
        <div style={styles.consent}>
          <div style={styles.consentItem}>
            <Camera size={18} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }} />
            <span><strong>Camera</strong><br />Confirms the person taking the assessment.</span>
          </div>
          <div style={styles.consentItem}>
            <Mic size={18} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }} />
            <span><strong>Microphone</strong><br />Checks that your test environment is active.</span>
          </div>
          <div style={styles.consentItem}>
            <Maximize size={18} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }} />
            <span><strong>Fullscreen and focus</strong><br />Tracks fullscreen exits and tab switches for review.</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
