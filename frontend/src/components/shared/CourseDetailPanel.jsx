import { X, Star, Clock, BookOpen, CheckCircle, Circle, Play, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20, 30, 25, 0.46)',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
    background: 'var(--surface)',
    boxShadow: '-8px 0 30px rgba(30, 50, 40, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.3s var(--ease)',
  },
  header: {
    padding: '20px 24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  tags: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'transparent',
    color: 'var(--muted)',
    display: 'grid',
    placeItems: 'center',
    border: '1px solid var(--line)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--ink)',
    lineHeight: 1.2,
  },
  provider: {
    fontSize: 14,
    color: 'var(--muted)',
    marginTop: 2,
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    padding: '16px 24px',
    borderBottom: '1px solid var(--line)',
  },
  statBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 8px',
    background: 'var(--bg)',
    borderRadius: 12,
  },
  statValue: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--ink)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'var(--muted)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
  },
  description: {
    fontSize: 14,
    color: 'var(--muted)',
    lineHeight: 1.6,
    marginBottom: 16,
  },
  skillBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    background: 'var(--teal-soft)',
    borderRadius: 12,
    marginBottom: 20,
  },
  skillIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--teal)',
    color: 'var(--surface)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  skillText: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--teal)',
  },
  syllabusTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 12,
  },
  moduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  moduleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: 'var(--bg)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  moduleItemCompleted: {
    background: 'var(--teal-soft)',
  },
  moduleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  moduleIconCompleted: {
    background: 'var(--teal)',
    color: 'var(--surface)',
  },
  moduleIconCurrent: {
    background: 'var(--coral)',
    color: 'var(--surface)',
  },
  moduleIconPending: {
    background: 'var(--line)',
    color: 'var(--muted)',
  },
  moduleInfo: {
    flex: 1,
    minWidth: 0,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: 2,
  },
  moduleLessons: {
    fontSize: 12,
    color: 'var(--muted)',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--line)',
  },
  resumeButton: {
    width: '100%',
    background: 'var(--teal)',
    color: 'var(--surface)',
  },
};

export default function CourseDetailPanel({ course, onClose, onResume }) {
  if (!course) return null;

  const getLevelLabel = (level) => {
    const labels = {
      1: 'Beginner',
      2: 'Intermediate',
      3: 'Advanced',
      4: 'Expert',
    };
    return labels[level] || 'All Levels';
  };

  const handleResume = () => {
    if (onResume) onResume(course.courseId);
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.topRow}>
            <div style={styles.tags}>
              {course.category && (
                <Tag variant="default">Builds {course.category} toward {course.technicalLevel} · {getLevelLabel(course.technicalLevel)}</Tag>
              )}
              <Tag variant="default">Certificate</Tag>
            </div>
            <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div>
            <h2 style={styles.title}>{course.name}</h2>
            <div style={styles.provider}>{course.provider}</div>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>
              <Star size={16} fill="var(--coral)" color="var(--coral)" />
              4.8
            </div>
            <div style={styles.statLabel}>rating</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>
              <Clock size={16} />
              {course.lessonCount || 12}h
            </div>
            <div style={styles.statLabel}>to finish</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>
              <BookOpen size={16} />
              {course.totalModules || course.lessonCount}
            </div>
            <div style={styles.statLabel}>modules</div>
          </div>
        </div>

        <div style={styles.content}>
          {course.description && (
            <div style={styles.description}>{course.description}</div>
          )}

          {course.category && (
            <div style={styles.skillBadge}>
              <div style={styles.skillIcon}>
                <BookOpen size={16} />
              </div>
              <div style={styles.skillText}>
                Builds {course.category} toward {course.technicalLevel} · {getLevelLabel(course.technicalLevel)}
              </div>
            </div>
          )}

          <h3 style={styles.syllabusTitle}>Syllabus</h3>
          <div style={styles.moduleList}>
            {course.modules?.map((module, index) => {
              const isCompleted = index < (course.completedModules || 0);
              const isCurrent = index === (course.completedModules || 0);
              
              return (
                <div
                  key={module.moduleNumber}
                  style={{
                    ...styles.moduleItem,
                    ...(isCompleted ? styles.moduleItemCompleted : {}),
                  }}
                >
                  <div
                    style={{
                      ...styles.moduleIcon,
                      ...(isCompleted
                        ? styles.moduleIconCompleted
                        : isCurrent
                        ? styles.moduleIconCurrent
                        : styles.moduleIconPending),
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle size={16} />
                    ) : isCurrent ? (
                      <Play size={14} />
                    ) : (
                      <Circle size={16} />
                    )}
                  </div>
                  <div style={styles.moduleInfo}>
                    <div style={styles.moduleName}>
                      {module.moduleNumber}. {module.name}
                    </div>
                    <div style={styles.moduleLessons}>
                      {module.lessonCount} {module.lessonCount === 1 ? 'lesson' : 'lessons'}
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--muted)" />
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.footer}>
          <Button
            variant="secondary"
            style={styles.resumeButton}
            onClick={handleResume}
          >
            Resume course
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
