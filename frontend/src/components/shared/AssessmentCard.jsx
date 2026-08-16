import Tag from '../ui/Tag';
import ProgressBar from '../ui/ProgressBar';
import Button from '../ui/Button';
import { ArrowUpRight, FileText, Clock, RotateCcw } from 'lucide-react';

const styles = {
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--line)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  cardRecommended: {
    border: '2px solid var(--coral)',
    boxShadow: '0 0 0 4px var(--coral-soft)',
  },
  tags: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: 'var(--ink)',
    lineHeight: 1.5,
    marginBottom: 16,
    flex: 1,
  },
  levelSection: {
    marginBottom: 16,
  },
  levelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelLabel: {
    fontSize: 12,
    color: 'var(--muted)',
  },
  levelValue: {
    fontSize: 12,
    fontWeight: 700,
  },
  levelCurrent: {
    color: 'var(--ink)',
  },
  levelTarget: {
    color: 'var(--coral)',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  progressScore: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--ink)',
    whiteSpace: 'nowrap',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 16,
    borderTop: '1px solid var(--line)',
  },
  info: {
    display: 'flex',
    gap: 16,
    fontSize: 12,
    color: 'var(--muted)',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
};

export default function AssessmentCard({
  skillId,
  skillName,
  category,
  currentLevel,
  currentLevelLabel,
  targetLevel,
  targetLevelLabel,
  gap,
  hasAssessment,
  questionCount,
  timeLimitMinutes,
  sourceLabel,
  companyName,
  proctored,
  isRecommended,
  onStart,
}) {
  const progressPercent = targetLevel > 0 ? Math.round((currentLevel / targetLevel) * 100) : 0;

  return (
    <div style={{ ...styles.card, ...(isRecommended ? styles.cardRecommended : {}) }}>
      <div style={styles.tags}>
        {isRecommended && <Tag variant="coral">Recommended next</Tag>}
        {companyName ? (
          <Tag variant="sand">{companyName}</Tag>
        ) : (
          <Tag variant="default">{sourceLabel || 'AI-generated'}</Tag>
        )}
        {proctored ? (
          <Tag variant="default">Proctored</Tag>
        ) : (
          <Tag variant="sand">Not proctored</Tag>
        )}
      </div>

      <div style={styles.title}>{skillName}</div>
      <div style={styles.meta}>
        {category || 'Assessment'} {category ? `· ${category}` : ''}
      </div>

      <div style={styles.description}>
        {gap > 0
          ? `Close your ${gap} level gap for ${targetLevelLabel}. Verify your skills with a proctored assessment.`
          : `You've reached the target level. Retake to improve or refresh your knowledge.`}
      </div>

      <div style={styles.levelSection}>
        <div style={styles.levelRow}>
          <span style={styles.levelLabel}>
            Current · <span style={styles.levelCurrent}>{currentLevelLabel}</span>
          </span>
          <span style={styles.levelLabel}>
            Target · <span style={styles.levelTarget}>{targetLevelLabel}</span>
          </span>
        </div>
        <div style={styles.progressRow}>
          <ProgressBar
            percent={progressPercent}
            color={gap > 0 ? 'var(--coral)' : 'var(--teal)'}
            style={{ flex: 1 }}
          />
          <span style={styles.progressScore}>
            {currentLevel} / {targetLevel}
          </span>
        </div>
      </div>

      <div style={styles.footer}>
        <div style={styles.info}>
          <span style={styles.infoItem}>
            <FileText size={14} />
            {questionCount} questions
          </span>
          <span style={styles.infoItem}>
            <Clock size={14} />
            {timeLimitMinutes} min
          </span>
        </div>
        <Button variant={isRecommended ? 'primary' : 'secondary'} onClick={() => onStart(skillId, skillName)}>
          {hasAssessment ? (
            <>
              <RotateCcw size={14} /> Retake
            </>
          ) : (
            <>
              Start <ArrowUpRight size={14} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
