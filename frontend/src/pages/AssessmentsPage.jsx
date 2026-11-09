import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Button from '../components/ui/Button';
import EmptyState from '../components/shared/EmptyState';
import AssessmentCard from '../components/shared/AssessmentCard';
import Modal from '../components/ui/Modal';
import AssessmentModal from '../components/ui/AssessmentModal';
import Skeleton, { SkeletonCard, SkeletonStatus } from '../components/ui/Skeleton';
import LiquidMeter from '../components/water/LiquidMeter';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { api } from '../api/client';
import {
  TrendingUp, Shield, Target, Camera, Maximize, Check, AlertCircle, Loader2, ExternalLink,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { ErrorCard } from '../components/ui/ErrorState';
import styles from './AssessmentsPage.module.css';

/** Highest verified level a skill assessment can award (1 No Knowledge .. 5 Expert). */
const MAX_LEVEL = 5;

/** Browser help for re-enabling a blocked camera. */
const CAMERA_HELP_URL = 'https://support.google.com/chrome/answer/2693767';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Score as a 0-100 fill: score / max. Prefers an explicit percent, else level / MAX_LEVEL. */
function resultScorePercent(result) {
  if (typeof result.scorePercent === 'number') return result.scorePercent;
  if (typeof result.scoredLevel === 'number') return (result.scoredLevel / MAX_LEVEL) * 100;
  return null;
}

export default function AssessmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { applications } = useApplications();
  const [available, setAvailable] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // idle (pre-flight) | requesting | granted | denied (NotAllowedError) | unavailable (any other failure)
  const [deviceCheck, setDeviceCheck] = useState('idle');
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const { showToast } = useToast();
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [currentSkillId, setCurrentSkillId] = useState(null);
  const [currentSkillName, setCurrentSkillName] = useState('');
  const [currentProctored, setCurrentProctored] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let failed = false;
    let failure = '';
    setLoading(true);
    Promise.all([
      api.get('/assessments/available', { signal: controller.signal }).catch((err) => {
        if (err?.name === 'AbortError') return null;
        failed = true;
        failure = err?.message || err?.error || '';
        return null;
      }),
      api.get('/assessments/results', { signal: controller.signal }).catch(() => []),
    ])
      .then(([avail, res]) => {
        setError(failed ? (failure || true) : false);
        setAvailable(avail);
        setResults(res || []);
        if (failed) showToast('Could not load assessments — please retry', 'error');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [retryKey, showToast]);

  const targetRole = user?.targetRole?.trim()
    || applications.find((a) => a.targetRole?.trim())?.targetRole?.trim();

  function closeModal() {
    setDeviceCheck('idle');
    setModalOpen(false);
  }

  /**
   * Invokes the browser camera prompt. Called only from the pre-flight "continue" and
   * the denial "retry" actions, synchronously inside the click handler so the prompt
   * appears immediately. No attempt exists yet, so a denial leaves nothing started.
   */
  async function requestCamera() {
    setDeviceCheck('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      if (!mounted.current) return;
      setDeviceCheck('granted');
      // Warm the proctoring model chunk; mediapipe is only ever loaded from this page's flow.
      import('@mediapipe/tasks-vision').catch(() => {});
    } catch (err) {
      if (!mounted.current) return;
      setDeviceCheck(err?.name === 'NotAllowedError' ? 'denied' : 'unavailable');
    }
  }

  function handleLeave() {
    closeModal();
    navigate('/dashboard');
  }

  async function handleStartAssessment(skillId, skillName) {
    setCurrentSkillName(skillName);
    setCurrentSkillId(skillId);
    setDeviceCheck('idle');
    const assessment = available?.assessments?.find((a) => a.skillId === skillId);
    setCurrentProctored(assessment?.proctored !== false);

    if (assessment && assessment.proctored === false) {
      await confirmStartAssessment(skillId);
      return;
    }

    setModalOpen(true);
  }

  async function confirmStartAssessment(skillId) {
    const assessment = available?.assessments?.find((a) => a.skillId === skillId);
    if (assessment) setCurrentProctored(assessment.proctored !== false);
    try {
      const response = await api.post('/assessments/start', { skillId });
      setCurrentAssessmentId(response.assessmentId);
      setModalOpen(false);
      setAssessmentOpen(true);
      showToast(`${assessment?.skillName || currentSkillName || 'Assessment'} started — good luck!`, 'success');
    } catch (err) {
      setDeviceCheck('idle');
      setModalOpen(false);
      showToast(err?.message || 'Could not start assessment', 'error');
    }
  }

  const recommendedSkillIds = new Set(
    (available?.assessments || []).filter((a) => a.gap > 0).map((a) => a.skillId),
  );

  let footer;
  if (deviceCheck === 'idle') {
    footer = (
      <>
        <Button variant="ghost" onClick={closeModal}>Not now</Button>
        <Button variant="primary" onClick={requestCamera}>Continue to camera check</Button>
      </>
    );
  } else if (deviceCheck === 'requesting') {
    footer = <Button variant="ghost" disabled>Waiting for camera…</Button>;
  } else if (deviceCheck === 'granted') {
    footer = (
      <>
        <Button variant="ghost" onClick={closeModal}>Close</Button>
        <Button variant="primary" onClick={() => confirmStartAssessment(currentSkillId)}>Start assessment</Button>
      </>
    );
  } else {
    footer = (
      <>
        <Button variant="ghost" onClick={handleLeave}>Leave</Button>
        <Button variant="primary" onClick={requestCamera}>Try again</Button>
      </>
    );
  }

  return (
    <div className="view-enter">
      <div className={styles.heading}>
        <h1 className={styles.title}>Assessments</h1>
        <p className={styles.subtitle}>
          Verified results strengthen your skill profile and your job match. Take an
          assessment — proctored or company-authored — to verify your skills.
        </p>
      </div>

      {!loading && available && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconTeal}`} aria-hidden="true">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className={styles.statValue}>{available.matchPercent}%</div>
              <div className={styles.statLabel}>{targetRole || 'Target role'} match</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGood}`} aria-hidden="true">
              <Shield size={22} />
            </div>
            <div>
              <div className={styles.statValue}>{available.verifiedSkillsCount}</div>
              <div className={styles.statLabel}>Verified skills</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconCoral}`} aria-hidden="true">
              <Target size={22} />
            </div>
            <div>
              <div className={styles.statValue}>{available.recommendedCount}</div>
              <div className={styles.statLabel}>Recommended assessment</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.contentGrid}>
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Available assessments</h2>
            {available?.assessments && (
              <Tag>{available.assessments.length} skills</Tag>
            )}
          </div>

          {loading ? (
            <SkeletonStatus label="Loading...">
              <div className={styles.assessmentGrid}>
                {Array.from({ length: 4 }, (_, i) => (
                  <SkeletonCard key={i} minHeight={150} />
                ))}
              </div>
            </SkeletonStatus>
          ) : error ? (
            <ErrorCard
              title="Couldn’t load assessments"
              description={typeof error === 'string' && error
                ? error
                : 'We couldn’t reach the assessment service. Check your connection and try again.'}
              retryLabel="Retry"
              onRetry={() => setRetryKey((k) => k + 1)}
            />
          ) : !available?.assessments?.length ? (
            <Panel>
              <EmptyState
                title={targetRole ? 'All skills matched' : 'No available assessments'}
                description={targetRole
                  ? 'You have no remaining skill gaps for your target role.'
                  : 'Set a target role to see which assessments to take.'}
              />
            </Panel>
          ) : (
            <div className={styles.assessmentGrid}>
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
                  sourceLabel={assessment.sourceLabel}
                  companyName={assessment.companyName}
                  proctored={assessment.proctored}
                  isSkillAssessment={assessment.isSkillAssessment}
                  isRecommended={recommendedSkillIds.has(assessment.skillId)}
                  onStart={handleStartAssessment}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.side}>
          <Panel>
            <h3 className={styles.resultsTitle}>Recent results</h3>
            {loading ? (
              <SkeletonStatus label="Loading...">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className={styles.skeletonRow}>
                    <Skeleton height={26} width={26} radius="50%" />
                    <div className={styles.skeletonGrow}>
                      <Skeleton height={13} width="55%" style={{ marginBottom: 6 }} />
                      <Skeleton height={11} width="35%" />
                    </div>
                  </div>
                ))}
              </SkeletonStatus>
            ) : results.length === 0 ? (
              <EmptyState
                title="No results yet"
                description="Verified assessment results will appear here."
              />
            ) : (
              results.map((result) => {
                const score = resultScorePercent(result);
                return (
                  <div key={result.assessmentId} className={styles.resultItem}>
                    <div className={styles.resultRow}>
                      <div className={styles.resultLeft}>
                        <div className={styles.resultCheck} aria-hidden="true">
                          <Check size={14} />
                        </div>
                        <div>
                          <div className={styles.resultName}>{result.skillName}</div>
                          <div className={styles.resultDate}>Verified {formatDate(result.completedAt)}</div>
                        </div>
                      </div>
                      <Tag variant="good">{result.scoredLevel} {result.levelLabel}</Tag>
                    </div>
                    <LiquidMeter value={score} label={`${result.skillName} score`} tone="good" />
                  </div>
                );
              })
            )}
          </Panel>

          <Panel style={{ marginTop: 'var(--space-6)' }}>
            <h4 className={styles.howTitle}>
              <Target size={16} className={styles.howIcon} aria-hidden="true" />
              How verification works
            </h4>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepText}>
                Proctored assessments request camera, mic, and focus up front; company assessments run without them.
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepText}>
                Pass a quick device check before a proctored timer starts.
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepText}>
                Your verified level is added to credentials and job matching.
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        eyebrow="Before the timer starts"
        title={currentSkillName || 'Assessment'}
        footer={footer}
      >
        {deviceCheck === 'idle' && (
          <>
            <p className={styles.modalDesc}>
              This assessment is proctored. We need your camera to confirm that you are the person taking it and to
              flag looking away, extra people or a phone in view. Your browser will ask for permission only after you
              continue, and we use the camera only for this attempt.
            </p>
            <div className={styles.permItem}>
              <div className={styles.permIcon} aria-hidden="true"><Camera size={18} /></div>
              <div>
                <div className={styles.permTitle}>Camera</div>
                <div className={styles.permDesc}>Confirms the person taking the assessment.</div>
              </div>
            </div>
            <div className={styles.permItem}>
              <div className={styles.permIcon} aria-hidden="true"><Maximize size={18} /></div>
              <div>
                <div className={styles.permTitle}>Fullscreen and focus</div>
                <div className={styles.permDesc}>Tracks fullscreen exits and tab switches for review.</div>
              </div>
            </div>
          </>
        )}

        {deviceCheck === 'requesting' && (
          <div className={styles.centered} role="status">
            <div className={`${styles.stateIcon} ${styles.stateIconBusy}`} aria-hidden="true">
              <Loader2 size={24} className={styles.spin} />
            </div>
            <p className={styles.stateTitle}>Waiting for camera access…</p>
            <p className={styles.stateDesc}>Please choose Allow when your browser asks to use the camera.</p>
          </div>
        )}

        {deviceCheck === 'granted' && (
          <div className={styles.centered} role="status">
            <div className={`${styles.stateIcon} ${styles.stateIconOk}`} aria-hidden="true"><Check size={28} /></div>
            <p className={styles.stateTitle}>Camera ready</p>
            <p className={styles.stateDesc}>Your camera is working. You&apos;re ready to begin.</p>
          </div>
        )}

        {deviceCheck === 'denied' && (
          <div className={styles.centered} role="alert">
            <div className={`${styles.stateIcon} ${styles.stateIconBad}`} aria-hidden="true"><AlertCircle size={28} /></div>
            <p className={styles.stateTitle}>Camera access needed</p>
            <p className={styles.stateDesc}>
              This assessment is proctored, so the camera is required to confirm who is taking it. Camera permission
              was blocked, so your attempt has not started and no answers were recorded. Allow the camera for this
              site, then try again, or leave the attempt.
            </p>
            <a className={styles.helpLink} href={CAMERA_HELP_URL} target="_blank" rel="noopener noreferrer">
              How to turn the camera back on <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        )}

        {deviceCheck === 'unavailable' && (
          <div className={styles.centered} role="alert">
            <div className={`${styles.stateIcon} ${styles.stateIconBad}`} aria-hidden="true"><AlertCircle size={28} /></div>
            <p className={styles.stateTitle}>Camera not available</p>
            <p className={styles.stateDesc}>
              We couldn&apos;t find or start a camera. Check that it is connected and not used by another app. Your
              attempt has not started.
            </p>
            <a className={styles.helpLink} href={CAMERA_HELP_URL} target="_blank" rel="noopener noreferrer">
              Camera help <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        )}
      </Modal>

      <AssessmentModal
        open={assessmentOpen}
        onClose={() => { setAssessmentOpen(false); setCurrentAssessmentId(null); }}
        assessmentId={currentAssessmentId}
        skillName={currentSkillName}
        proctored={currentProctored}
      />
    </div>
  );
}
