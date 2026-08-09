import { useState, useEffect } from 'react';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Button from '../components/ui/Button';
import EmptyState from '../components/shared/EmptyState';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ArrowUpRight, Camera, Mic, Maximize, Check, AlertCircle, Loader2 } from 'lucide-react';

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
    maxWidth: 450,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: 16,
  },
  col7: { gridColumn: 'span 7' },
  col5: { gridColumn: 'span 5' },
  recBadge: {
    display: 'inline-block',
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 999,
    marginBottom: 14,
  },
  recTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
  },
  recMeta: {
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 16,
  },
  recBanner: {
    background: 'var(--coral-soft)',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 13,
    color: 'var(--ink)',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  resultsH3: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 19,
    marginBottom: 16,
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
  },
  resultName: {
    fontSize: 14,
    fontWeight: 700,
  },
  resultDate: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 2,
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
  modalDesc: {
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.55,
    marginBottom: 18,
  },
  permItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--coral-soft)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 10,
  },
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'var(--surface)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    color: 'var(--ink)',
  },
  permTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--ink)',
  },
  permDesc: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 1,
  },
  checking: {
    textAlign: 'center',
    padding: '32px 0',
  },
  checkingSpinner: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
    marginBottom: 14,
    animation: 'spin 1s linear infinite',
  },
  checkingText: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--ink)',
  },
  checkingSubtext: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 4,
  },
  success: {
    textAlign: 'center',
    padding: '24px 0',
  },
  successIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 4,
  },
  successDesc: {
    fontSize: 13,
    color: 'var(--muted)',
  },
  error: {
    textAlign: 'center',
    padding: '24px 0',
  },
  errorIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 4,
  },
  errorDesc: {
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.5,
  },
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AssessmentsPage() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deviceCheck, setDeviceCheck] = useState('idle');

  useEffect(() => {
    let failed = false;
    Promise.all([
      api.get('/assessments/recommended').catch(() => {
        failed = true;
        return null;
      }),
      api.get('/assessments/results').catch(() => []),
    ])
      .then(([rec, res]) => {
        setError(failed);
        setRecommended(rec);
        setResults(res || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const targetRole = user?.targetRole?.trim();

  async function handleDeviceCheck() {
    setDeviceCheck('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(t => t.stop());
      setDeviceCheck('success');
    } catch {
      setDeviceCheck('error');
    }
  }

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
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : recommended ? (
            <div>
              <span style={styles.recBadge}>Recommended next</span>
              <h2 style={styles.recTitle}>{recommended.skillName}</h2>
              <p style={styles.recMeta}>
                30 questions · 45 minutes · Proctored · Builds toward {recommended.targetLevelLabel}
              </p>
              <div style={styles.recBanner}>
                <div>Your current level is {recommended.currentLevel} {recommended.currentLevelLabel}.</div>
                <div>A verified result can move this skill into your job applications.</div>
              </div>
              <Button variant="primary" onClick={() => { setDeviceCheck('idle'); setModalOpen(true); }}>
                Start assessment <ArrowUpRight size={14} />
              </Button>
            </div>
          ) : (
            <EmptyState
              title={targetRole && !error ? 'All skills matched' : 'No recommended assessment'}
              description={targetRole && !error
                ? 'You have no remaining skill gaps for your target role.'
                : 'Set a target role to see which assessment to take next.'}
            />
          )}
        </Panel>

        <Panel style={styles.col5}>
          <h3 style={styles.resultsH3}>Recent results</h3>
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : results.length === 0 ? (
            <EmptyState
              title="No results yet"
              description="Verified assessment results will appear here."
            />
          ) : (
            results.map((result, i) => (
              <div key={result.assessmentId} style={{
                ...styles.resultItem,
                borderBottom: i === results.length - 1 ? 'none' : '1px solid var(--line)',
              }}>
                <div>
                  <div style={styles.resultName}>{result.skillName}</div>
                  <div style={styles.resultDate}>Verified {formatDate(result.completedAt)}</div>
                </div>
                <Tag variant="good">{result.scoredLevel} {result.levelLabel}</Tag>
              </div>
            ))
          )}
        </Panel>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setDeviceCheck('idle'); setModalOpen(false); }}
        eyebrow="Before the timer starts"
        title={recommended?.skillName || 'Assessment'}
        footer={
          deviceCheck === 'idle' ? (
            <>
              <Button variant="ghost" onClick={() => { setDeviceCheck('idle'); setModalOpen(false); }}>
                Not now
              </Button>
              <Button variant="primary" onClick={handleDeviceCheck}>
                Continue to device check
              </Button>
            </>
          ) : deviceCheck === 'checking' ? (
            <Button variant="ghost" disabled>
              Checking...
            </Button>
          ) : deviceCheck === 'success' ? (
            <>
              <Button variant="ghost" onClick={() => { setDeviceCheck('idle'); setModalOpen(false); }}>
                Close
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Start assessment
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => { setDeviceCheck('idle'); setModalOpen(false); }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleDeviceCheck}>
                Try again
              </Button>
            </>
          )
        }
      >
        {deviceCheck === 'idle' && (
          <>
            <p style={styles.modalDesc}>
              This assessment uses a few permissions to verify the session. We only use them for this attempt.
            </p>
            <div style={styles.permItem}>
              <div style={styles.permIcon}><Camera size={18} /></div>
              <div>
                <div style={styles.permTitle}>Camera</div>
                <div style={styles.permDesc}>Confirms the person taking the assessment.</div>
              </div>
            </div>
            <div style={styles.permItem}>
              <div style={styles.permIcon}><Mic size={18} /></div>
              <div>
                <div style={styles.permTitle}>Microphone</div>
                <div style={styles.permDesc}>Checks that your test environment is active.</div>
              </div>
            </div>
            <div style={styles.permItem}>
              <div style={styles.permIcon}><Maximize size={18} /></div>
              <div>
                <div style={styles.permTitle}>Fullscreen and focus</div>
                <div style={styles.permDesc}>Tracks fullscreen exits and tab switches for review.</div>
              </div>
            </div>
          </>
        )}

        {deviceCheck === 'checking' && (
          <div style={styles.checking}>
            <div style={styles.checkingSpinner}><Loader2 size={24} /></div>
            <div style={styles.checkingText}>Checking devices...</div>
            <div style={styles.checkingSubtext}>Please allow camera and microphone access when prompted.</div>
          </div>
        )}

        {deviceCheck === 'success' && (
          <div style={styles.success}>
            <div style={styles.successIcon}><Check size={28} /></div>
            <div style={styles.successTitle}>Devices ready</div>
            <div style={styles.successDesc}>Camera and microphone are working. You're ready to begin.</div>
          </div>
        )}

        {deviceCheck === 'error' && (
          <div style={styles.error}>
            <div style={styles.errorIcon}><AlertCircle size={28} /></div>
            <div style={styles.errorTitle}>Device access needed</div>
            <div style={styles.errorDesc}>
              Camera or microphone permission was denied. Please enable them in your browser settings and try again.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
