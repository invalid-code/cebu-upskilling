import { ChevronDown, Play, CheckCircle, Circle, Clock } from 'lucide-react';

const styles = {
  container: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--line)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid var(--line)',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--muted)',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--ink)',
    marginTop: 2,
  },
  progressCard: {
    margin: 12,
    padding: '14px 16px',
    background: 'var(--teal-soft)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  progressIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'var(--teal)',
    color: 'var(--surface)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  progressText: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--ink)',
  },
  progressSubtitle: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 2,
  },
  lessonList: {
    padding: '0 12px 12px',
  },
  lessonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  lessonItemCurrent: {
    background: 'var(--teal)',
    color: 'var(--surface)',
  },
  lessonItemCompleted: {
    background: 'var(--teal-soft)',
  },
  lessonIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  lessonIconCompleted: {
    background: 'var(--teal)',
    color: 'var(--surface)',
  },
  lessonIconCurrent: {
    background: 'var(--coral)',
    color: 'var(--surface)',
  },
  lessonIconPending: {
    background: 'var(--line)',
    color: 'var(--muted)',
  },
  lessonInfo: {
    flex: 1,
    minWidth: 0,
  },
  lessonName: {
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  lessonDuration: {
    fontSize: 11,
    color: 'var(--muted)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  allModules: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '12px 16px',
    borderTop: '1px solid var(--line)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--muted)',
    cursor: 'pointer',
  },
};

export default function CourseOutline({ modules, currentLessonId, onLessonClick }) {
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = modules.reduce((acc, m) => acc + m.completedLessonCount, 0);

  const currentModule = modules.find(m =>
    m.lessons.some(l => l.lessonId === currentLessonId)
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Course Outline</div>
          <div style={styles.headerSubtitle}>
            {currentModule
              ? `Module ${currentModule.moduleNumber} · ${currentModule.name}`
              : 'All Modules'}
          </div>
        </div>
        <ChevronDown size={18} color="var(--muted)" />
      </div>

      <div style={styles.progressCard}>
        <div style={styles.progressIcon}>
          <Play size={16} />
        </div>
        <div style={styles.progressText}>
          <div style={styles.progressTitle}>Your progress</div>
          <div style={styles.progressSubtitle}>
            {completedLessons} of {totalLessons} lessons
          </div>
        </div>
      </div>

      <div style={styles.lessonList}>
        {modules.map((module) =>
          module.lessons.map((lesson) => {
            const isCurrent = lesson.lessonId === currentLessonId;
            const isCompleted = lesson.isCompleted;

            return (
              <div
                key={lesson.lessonId}
                style={{
                  ...styles.lessonItem,
                  ...(isCurrent ? styles.lessonItemCurrent : {}),
                  ...(isCompleted && !isCurrent ? styles.lessonItemCompleted : {}),
                }}
                onClick={() => onLessonClick(lesson.lessonId)}
              >
                <div
                  style={{
                    ...styles.lessonIcon,
                    ...(isCompleted
                      ? styles.lessonIconCompleted
                      : isCurrent
                      ? styles.lessonIconCurrent
                      : styles.lessonIconPending),
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle size={14} />
                  ) : isCurrent ? (
                    <Play size={12} />
                  ) : (
                    <Circle size={14} />
                  )}
                </div>
                <div style={styles.lessonInfo}>
                  <div style={{
                    ...styles.lessonName,
                    color: isCurrent ? 'var(--surface)' : 'var(--ink)',
                  }}>
                    {lesson.name}
                  </div>
                  <div style={{
                    ...styles.lessonDuration,
                    color: isCurrent ? 'rgba(255,255,255,0.8)' : 'var(--muted)',
                  }}>
                    <Clock size={10} />
                    {lesson.durationMinutes} min
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={styles.allModules}>
        <span>All course modules</span>
      </div>
    </div>
  );
}
