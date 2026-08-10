import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock, X, Award, CheckCircle, RotateCcw, Loader2 } from 'lucide-react';
import Button from './Button';
import { api } from '../../api/client';

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20, 30, 25, 0.46)',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 18,
    maxWidth: 560,
    width: '100%',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 36px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 22px',
    borderBottom: '1px solid var(--line)',
  },
  questionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 700,
    color: 'var(--muted)',
    marginBottom: 4,
  },
  skillTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--ink)',
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    padding: '8px 14px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 14,
    fontVariantNumeric: 'tabular-nums',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '22px',
  },
  questionText: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--ink)',
    lineHeight: 1.4,
    marginBottom: 24,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 18px',
    borderRadius: 12,
    border: '2px solid var(--line)',
    background: 'var(--surface)',
    cursor: 'pointer',
    marginBottom: 10,
    transition: 'border-color 0.15s, background 0.15s',
  },
  optionSelected: {
    borderColor: 'var(--teal)',
    background: 'var(--teal-soft)',
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--surface2)',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: 13,
    color: 'var(--muted)',
    flexShrink: 0,
  },
  optionLetterSelected: {
    background: 'var(--teal)',
    color: 'var(--surface)',
  },
  optionText: {
    fontSize: 14,
    color: 'var(--ink)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 22px',
    borderTop: '1px solid var(--line)',
  },
  progress: {
    fontSize: 13,
    color: 'var(--muted)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'transparent',
    color: 'var(--muted)',
    display: 'grid',
    placeItems: 'center',
    border: 0,
    cursor: 'pointer',
    flexShrink: 0,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: 12,
  },
  loadingSpinner: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--ink)',
  },
  completedBody: {
    padding: '32px 24px',
    textAlign: 'center',
  },
  completedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    marginBottom: 16,
  },
  scoreText: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 4,
  },
  scoreSubtext: {
    fontSize: 14,
    color: 'var(--muted)',
    marginBottom: 20,
  },
  levelBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    padding: '10px 18px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 18,
  },
  completedDesc: {
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.55,
    maxWidth: 380,
    margin: '0 auto',
  },
  completedFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 22px',
    borderTop: '1px solid var(--line)',
  },
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function AssessmentModal({ open, onClose, assessmentId, skillName: initialSkillName }) {
  const [questions, setQuestions] = useState([]);
  const [skillName, setSkillName] = useState(initialSkillName || 'Assessment');
  const [timeLimit, setTimeLimit] = useState(45 * 60);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const question = questions[current];

  useEffect(() => {
    if (!open || !assessmentId) return;

    setCurrent(0);
    setAnswers({});
    setCompleted(false);
    setResult(null);
    setError(null);
    setLoading(true);

    api.get(`/assessments/${assessmentId}/questions`)
      .then((data) => {
        setQuestions(data.questions || []);
        setSkillName(data.skillName || initialSkillName || 'Assessment');
        setTimeLimit(data.timeLimitMinutes * 60);
        setTimeLeft(data.timeLimitMinutes * 60);
      })
      .catch(() => {
        setError('Failed to load questions');
      })
      .finally(() => setLoading(false));
  }, [open, assessmentId, initialSkillName]);

  const select = useCallback((idx) => {
    setAnswers(prev => ({ ...prev, [question?.questionId]: idx }));
  }, [question?.questionId]);

  const handleSubmit = useCallback(async () => {
    if (submitting || completed) return;
    setSubmitting(true);
    try {
      const answerList = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId: parseInt(questionId),
        selectedOption,
      }));

      const response = await api.post(`/assessments/${assessmentId}/submit`, {
        answers: answerList,
      });

      setResult(response);
      setCompleted(true);
    } catch {
      setError('Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }, [assessmentId, answers, submitting, completed]);

  useEffect(() => {
    if (!open || completed || submitting || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => {
      if (t <= 1) {
        handleSubmit();
        return 0;
      }
      return t - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [open, completed, submitting, timeLeft, handleSubmit]);

  const handleRetake = useCallback(() => {
    setCurrent(0);
    setAnswers({});
    setTimeLeft(timeLimit);
    setCompleted(false);
    setResult(null);
    setError(null);
  }, [timeLimit]);

  const answeredCount = Object.keys(answers).length;

  if (!open) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.loadingSpinner}><Loader2 size={24} /></div>
            <div style={styles.loadingText}>Loading questions...</div>
          </div>
        ) : error && !completed ? (
          <>
            <div style={styles.header}>
              <div>
                <div style={styles.questionLabel}>Error</div>
                <div style={styles.skillTitle}>{skillName}</div>
              </div>
              <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div style={styles.loading}>
              <div style={styles.loadingText}>{error}</div>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </>
        ) : !completed ? (
          <>
            <div style={styles.header}>
              <div>
                <div style={styles.questionLabel}>Question {current + 1} of {questions.length}</div>
                <div style={styles.skillTitle}>{skillName}</div>
              </div>
              <div style={styles.timer}>
                <Clock size={16} />
                {formatTime(timeLeft)}
              </div>
            </div>

            <div style={styles.body}>
              {question && (
                <>
                  <div style={styles.questionText}>{question.text}</div>
                  {question.options.map((opt, i) => {
                    const selected = answers[question.questionId] === i;
                    return (
                      <div
                        key={i}
                        style={{ ...styles.option, ...(selected ? styles.optionSelected : {}) }}
                        onClick={() => select(i)}
                      >
                        <div style={{ ...styles.optionLetter, ...(selected ? styles.optionLetterSelected : {}) }}>
                          {LETTERS[i]}
                        </div>
                        <div style={styles.optionText}>{opt}</div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div style={styles.footer}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button
                  variant="ghost"
                  onClick={() => setCurrent(c => Math.max(0, c - 1))}
                  disabled={current === 0}
                >
                  <ChevronLeft size={16} /> Back
                </Button>
                <span style={styles.progress}>{answeredCount}/{questions.length} answered</span>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (current < questions.length - 1) {
                    setCurrent(c => c + 1);
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <>Submitting...</>
                ) : current < questions.length - 1 ? (
                  <>Next <ChevronRight size={16} /></>
                ) : (
                  <>Finish <ChevronRight size={16} /></>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div style={styles.header}>
              <div>
                <div style={styles.questionLabel}>Assessment complete</div>
                <div style={styles.skillTitle}>{skillName}</div>
              </div>
              <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div style={styles.completedBody}>
              <div style={styles.completedBadge}>
                <Award size={32} />
              </div>
              <div style={styles.scoreText}>{result?.scorePercent || 0}% score</div>
              <div style={styles.scoreSubtext}>
                You answered {result?.correctAnswers || 0} of {result?.totalQuestions || questions.length} correctly.
              </div>
              <div style={styles.levelBadge}>
                <CheckCircle size={18} />
                New verified level · {result?.scoredLevel || 1} {result?.levelLabel || 'No Knowledge'}
              </div>
              <div style={styles.completedDesc}>
                This verified result is added to your credentials and strengthens your Frontend Developer job match.
              </div>
            </div>

            <div style={styles.completedFooter}>
              <Button variant="ghost" onClick={handleRetake}>
                <RotateCcw size={16} /> Retake
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Add to credentials
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
