import { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, Circle, Clock, ChevronDown } from 'lucide-react';

const styles = {
  container: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--line)',
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid var(--line)',
    cursor: 'pointer',
    width: '100%',
    background: 'var(--surface)',
    borderTop: 0,
    borderLeft: 0,
    borderRight: 0,
    textAlign: 'left',
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
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderTop: 'none',
    borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    zIndex: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink)',
    background: 'var(--surface)',
    border: 0,
    borderTop: '1px solid var(--line)',
    textAlign: 'left',
    cursor: 'pointer',
  },
  dropdownItemSelected: {
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
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
};

function getModuleDisplayName(module) {
  if (!module) return '';
  const trimmed = (module.name || '').trim();
  if (!trimmed) return `Module ${module.moduleNumber}`;
  if (trimmed === `Module ${module.moduleNumber}`) return trimmed;
  // avoid duplication if name already contains module number prefix
  if (trimmed.startsWith('Module ')) return trimmed;
  return `Module ${module.moduleNumber} · ${trimmed}`;
}

export default function ModuleOutline({ modules, currentLessonId, onLessonClick }) {
  const currentModule = modules.find((m) =>
    m.lessons.some((l) => l.lessonId === currentLessonId)
  ) || modules[0];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(currentModule);
  const containerRef = useRef(null);
  const prevLessonIdRef = useRef(currentLessonId);

  useEffect(() => {
    // Only sync selected module when the current lesson actually changes (navigation),
    // not when user manually picks a different module from the dropdown.
    if (prevLessonIdRef.current !== currentLessonId) {
      prevLessonIdRef.current = currentLessonId;
      if (currentModule && selectedModule?.moduleNumber !== currentModule.moduleNumber) {
        setSelectedModule(currentModule);
      } else if (!selectedModule && currentModule) {
        setSelectedModule(currentModule);
      }
    } else if (!selectedModule && currentModule) {
      setSelectedModule(currentModule);
    }
  }, [currentLessonId, currentModule, selectedModule]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!selectedModule) return null;

  const displayModule = selectedModule || currentModule;
  const totalLessons = displayModule.lessons.length;
  const completedLessons = displayModule.completedLessonCount ?? displayModule.lessons.filter((l) => l.isCompleted).length;

  const handleProgressClick = () => {
    const nextLesson = displayModule.lessons.find((l) => !l.isCompleted && l.lessonId !== currentLessonId);
    if (nextLesson) {
      onLessonClick(nextLesson.lessonId);
      return;
    }
    // If all lessons in module completed, go to next lesson in module after current
    const currentIdx = displayModule.lessons.findIndex((l) => l.lessonId === currentLessonId);
    const fallback = displayModule.lessons[currentIdx + 1];
    if (fallback) onLessonClick(fallback.lessonId);
  };

  const isProgressClickable = displayModule.lessons.some((l) => !l.isCompleted && l.lessonId !== currentLessonId) ||
    displayModule.lessons.findIndex((l) => l.lessonId === currentLessonId) < totalLessons - 1;

  const handleModuleSelect = (module) => {
    setSelectedModule(module);
    setIsOpen(false);
  };

  return (
    <div style={{ ...styles.container, overflow: isOpen ? 'visible' : 'hidden' }} ref={containerRef}>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          style={{
            ...styles.header,
            borderBottom: isOpen ? '1px solid var(--line)' : '1px solid var(--line)',
          }}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select module"
        >
          <div>
            <div style={styles.headerTitle}>Module Outline</div>
            <div style={styles.headerSubtitle}>{getModuleDisplayName(displayModule)}</div>
          </div>
          <ChevronDown
            size={18}
            color="var(--muted)"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              flexShrink: 0,
            }}
          />
        </button>

        {isOpen && (
          <div role="listbox" aria-label="Module list" style={styles.dropdown}>
            {modules.map((module) => {
              const isSelected = module.moduleNumber === displayModule.moduleNumber;
              return (
                <button
                  key={`${module.moduleNumber}-${module.name}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  style={{
                    ...styles.dropdownItem,
                    ...(isSelected ? styles.dropdownItemSelected : {}),
                  }}
                  onClick={() => handleModuleSelect(module)}
                >
                  {getModuleDisplayName(module)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        style={{
          ...styles.progressCard,
          cursor: isProgressClickable ? 'pointer' : 'default',
          width: 'calc(100% - 24px)',
          border: 0,
          textAlign: 'left',
        }}
        onClick={isProgressClickable ? handleProgressClick : undefined}
        aria-label="Continue to next lesson in module"
        title="Continue to next lesson in module"
      >
        <div style={styles.progressIcon}>
          <Play size={16} />
        </div>
        <div style={styles.progressText}>
          <div style={styles.progressTitle}>Your progress</div>
          <div style={styles.progressSubtitle}>
            {completedLessons} of {totalLessons} lessons
          </div>
        </div>
      </button>

      <div style={styles.lessonList}>
        {displayModule.lessons.map((lesson) => {
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
                <div
                  style={{
                    ...styles.lessonName,
                    color: isCurrent ? 'var(--surface)' : 'var(--ink)',
                  }}
                >
                  {lesson.name}
                </div>
                <div
                  style={{
                    ...styles.lessonDuration,
                    color: isCurrent ? 'rgba(255,255,255,0.8)' : 'var(--muted)',
                  }}
                >
                  <Clock size={10} />
                  {lesson.durationMinutes} min
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
