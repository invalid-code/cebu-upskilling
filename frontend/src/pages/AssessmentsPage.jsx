import { useState, useEffect } from 'react';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Button from '../components/ui/Button';
import EmptyState from '../components/shared/EmptyState';
import AssessmentCard from '../components/shared/AssessmentCard';
import Modal from '../components/ui/Modal';
import AssessmentModal from '../components/ui/AssessmentModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { TrendingUp, Shield, Target, Camera, Mic, Maximize, Check, AlertCircle, Loader2 } from 'lucide-react';

const styles = {
  heading: {
    marginBottom: 28,
  },
  h1: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(2rem, 4vw, 3.3rem)',
  },
  subtitle: {
    color: 'var(--muted)',
    margin: '8px 0 0',
    maxWidth: 500,
    lineHeight: 1.5,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--line)',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  statIconTeal: {
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
  },
  statIconCoral: {
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
  },
  statIconGood: {
    background: 'rgb(210, 240, 220)',
    color: 'var(--good)',
  },
  statValue: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--ink)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 13,
    color: 'var(--muted)',
    marginTop: 2,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: 24,
    alignItems: 'start',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 19,
    fontWeight: 700,
  },
  assessmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  resultsPanel: {
    position: 'sticky',
    top: 24,
  },
  resultsTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 19,
    fontWeight: 700,
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
    color: 'var(--ink)',
  },
  resultDate: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 2,
  },
  resultCheck: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    marginRight: 12,
  },
  resultLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
  },
  howItWorks: {
    marginTop: 24,
  },
  howTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  step: {
    display: 'flex',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    display: 'grid',
    placeItems: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  stepText: {
    fontSize: 13,
    color: 'var(--ink)',
    lineHeight: 1.5,
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AssessmentsPage() {
  const { user } = useAuth();
  const [available, setAvailable] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deviceCheck, setDeviceCheck] = useState('idle');
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [currentSkillName, setCurrentSkillName] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let failed = false;
    Promise.all([
      api.get('/assessments/available', { signal: controller.signal }).catch(() => {
        failed = true;
        return null;
      }),
      api.get('/assessments/results', { signal: controller.signal }).catch(() => []),
    ])
      .then(([avail, res]) => {
        setError(failed);
        setAvailable(avail);
        setResults(res || []);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
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

  async function handleStartAssessment(skillId, skillName) {
    setCurrentSkillName(skillName);
    setDeviceCheck('idle');
    setModalOpen(true);
  }

  async function confirmStartAssessment(skillId) {
    try {
      const response = await api.post('/assessments/start', { skillId });
      setCurrentAssessmentId(response.assessmentId);
      setModalOpen(false);
      setAssessmentOpen(true);
    } catch {
      setDeviceCheck('idle');
      setModalOpen(false);
    }
  }

  const recommendedSkill = available?.assessments?.find(a => a.gap > 0);

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <h1 style={styles.h1}>Assessments</h1>
        <p style={styles.subtitle}>
          Verified results strengthen your skill profile and your job match. Take a proctored
          assessment to move a self-declared skill into your applications.
        </p>
      </div>

      {!loading && available && (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, ...styles.statIconTeal }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={styles.statValue}>{available.matchPercent}%</div>
              <div style={styles.statLabel}>{targetRole || 'Target role'} match</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, ...styles.statIconGood }}>
              <Shield size={22} />
            </div>
            <div>
              <div style={styles.statValue}>{available.verifiedSkillsCount}</div>
              <div style={styles.statLabel}>Verified skills</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, ...styles.statIconCoral }}>
              <Target size={22} />
            </div>
            <div>
              <div style={styles.statValue}>{available.recommendedCount}</div>
              <div style={styles.statLabel}>Recommended assessment</div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.contentGrid}>
        <div>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Available assessments</h2>
            {available?.assessments && (
              <Tag>{available.assessments.length} skills</Tag>
            )}
          </div>

          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : !available?.assessments?.length ? (
            <Panel>
              <EmptyState
                title={targetRole && !error ? 'All skills matched' : 'No available assessments'}
                description={targetRole && !error
                  ? 'You have no remaining skill gaps for your target role.'
                  : 'Set a target role to see which assessments to take.'}
              />
            </Panel>
          ) : (
            <div style={styles.assessmentGrid}>
              {available.assessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.skillId}
                  skillId={assessment.skillId}
                  skillName={assessment.skillName}
                  category={assessment.category}
                  currentLevel={assessment.currentLevel}
                  currentLevelLabel={assessment.currentLevelLabel}
                  targetLevel={assessment.targetLevel}
                  targetLevelLabel={assessment.targetLevelLabel}
                  gap={assessment.gap}
                  hasAssessment={assessment.hasAssessment}
                  questionCount={assessment.questionCount}
                  timeLimitMinutes={assessment.timeLimitMinutes}
                  isRecommended={assessment === recommendedSkill}
                  onStart={handleStartAssessment}
                />
              ))}
            </div>
          )}
        </div>

        <div style={styles.resultsPanel}>
          <Panel>
            <h3 style={styles.resultsTitle}>Recent results</h3>
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
                  <div style={styles.resultLeft}>
                    <div style={styles.resultCheck}>
                      <Check size={14} />
                    </div>
                    <div>
                      <div style={styles.resultName}>{result.skillName}</div>
                      <div style={styles.resultDate}>Verified {formatDate(result.completedAt)}</div>
                    </div>
                  </div>
                  <Tag variant="good">{result.scoredLevel} {result.levelLabel}</Tag>
                </div>
              ))
            )}
          </Panel>

          <Panel style={styles.howItWorks}>
            <h4 style={styles.howTitle}>
              <Target size={16} style={{ color: 'var(--teal)' }} />
              How verification works
            </h4>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepText}>
                Consent to proctoring — camera, mic, and focus, requested up front.
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepText}>
                Pass a quick device check before the timer starts.
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepText}>
                Your verified level is added to credentials and job matching.
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setDeviceCheck('idle'); setModalOpen(false); }}
        eyebrow="Before the timer starts"
        title={currentSkillName || 'Assessment'}
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
              <Button variant="primary" onClick={() => {
                const skill = available?.assessments?.find(a => a.skillName === currentSkillName);
                if (skill) confirmStartAssessment(skill.skillId);
              }}>
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

      <AssessmentModal
        open={assessmentOpen}
        onClose={() => { setAssessmentOpen(false); setCurrentAssessmentId(null); }}
        assessmentId={currentAssessmentId}
        skillName={currentSkillName}
      />
    </div>
  );
}
