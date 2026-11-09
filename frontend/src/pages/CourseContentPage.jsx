import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Loader2, MessageSquare, ListTree, X } from 'lucide-react';
import ModuleOutline from '../components/shared/ModuleOutline';
import LessonContent from '../components/shared/LessonContent';
import LessonResources from '../components/shared/LessonResources';
import VideoPlayer from '../components/shared/VideoPlayer';
import LiquidMeter from '../components/water/LiquidMeter';
import DataBoundView from '../components/ui/DataBoundView';
import Skeleton, { SkeletonText } from '../components/ui/Skeleton';
import useDataState from '../hooks/useDataState';
import useViewportMode from '../hooks/useViewportMode';
import useDialogFocus from '../lib/useDialogFocus';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import styles from './CourseContentPage.module.css';

/** How long the "Progress saved" indication stays visible (spec: at least 2s). */
const SAVED_INDICATION_MS = 3000;

const lessonsOf = (m) => (Array.isArray(m?.lessons) ? m.lessons : []);

/**
 * Overall course progress after a lesson reaches `lessonPercent`, using the same weighting as the API
 * (every lesson contributes an equal share). Never decreases the previous value.
 */
function computeOverallProgress(previous, lessonIndex, totalLessons, lessonPercent) {
  if (!(totalLessons > 0) || lessonIndex < 0) return previous;
  const share = 100 / totalLessons;
  const next = Math.floor((lessonIndex + Math.min(100, Math.max(0, lessonPercent)) / 100) * share);
  return Math.min(100, Math.max(previous ?? 0, next));
}

function PlayerSkeleton() {
  return (
    <div className={styles.skeletonLayout}>
      <div className={styles.skeletonOutline}>
        <div className={styles.skeletonStack}>
          <Skeleton height={18} width="55%" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={34} width="100%" radius={8} />
          ))}
        </div>
      </div>
      <div>
        <Skeleton height={240} width="100%" radius={14} style={{ marginBottom: 18 }} />
        <SkeletonText lines={5} lineHeight={13} gap={10} lastWidth="45%" />
      </div>
      <div className={styles.skeletonNotes}>
        <div className={styles.skeletonStack}>
          <Skeleton height={18} width="40%" />
          <Skeleton height={80} width="100%" radius={8} />
        </div>
      </div>
    </div>
  );
}

/** Drawer (outline) or bottom sheet (notes/discussion). Closed by default: only mounted while open. */
function Overlay({ kind, label, onClose, children }) {
  const ref = useRef(null);
  useDialogFocus(true, onClose, ref);
  const isDrawer = kind === 'drawer';
  return (
    <div
      className={`${styles.backdrop} ${isDrawer ? styles.backdropDrawer : styles.backdropSheet}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        className={`${styles.overlay} ${isDrawer ? styles.drawer : styles.sheet}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        <div className={styles.overlayHead}>
          <h2 className={styles.overlayTitle}>{label}</h2>
          <button type="button" className={styles.sheetClose} onClick={onClose} aria-label={`Close ${label.toLowerCase()}`}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.overlayBody}>{children}</div>
      </div>
    </div>
  );
}

export default function CourseContentPage() {
  useAuth();
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const state = useDataState(
    ({ signal }) => {
      const url = lessonId
        ? `/coursecontent/courses/${courseId}/content?lessonId=${lessonId}`
        : `/coursecontent/courses/${courseId}/content`;
      return api.get(url, { signal });
    },
    [courseId, lessonId],
  );

  // When starting/resuming without a lessonId the API returns the first unfinished lesson;
  // reflect it in the URL so deep-linking and refresh keep working.
  const resolvedLessonId = state.data?.currentLesson?.lessonId;
  useEffect(() => {
    if (!lessonId && state.status === 'success' && resolvedLessonId) {
      navigate(`/courses/${courseId}/learn/${resolvedLessonId}`, { replace: true });
    }
  }, [lessonId, state.status, resolvedLessonId, courseId, navigate]);

  return (
    <div className={`view-enter ${styles.page}`}>
      <DataBoundView
        state={{ ...state, data: state.status === 'error' ? undefined : state.data }}
        skeleton={<PlayerSkeleton />}
        loadingLabel="Loading course content..."
        errorTitle="Couldn’t load course content"
        isEmpty={(d) => !d?.currentLesson}
        empty={{
          title: 'Lesson unavailable',
          description: 'This lesson has no content yet — it may have been removed or the course is still being prepared.',
          action: { label: 'Back to courses', onClick: () => navigate('/courses') },
        }}
      >
        {(courseData) => (
          <Player
            key={courseId}
            courseData={courseData}
            courseId={courseId}
            lessonId={lessonId}
            navigate={navigate}
          />
        )}
      </DataBoundView>
    </div>
  );
}

function Player({ courseData, courseId, lessonId, navigate }) {
  const { showToast } = useToast();
  const mode = useViewportMode();
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [save, setSave] = useState({ status: 'idle', lessonId: null });
  // Locally confirmed progress; replaced by server data on the next fetch.
  const [live, setLive] = useState(null);
  const savedTimer = useRef(null);
  const saveSeq = useRef(0);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const modules = Array.isArray(courseData.modules) ? courseData.modules : [];
  const allLessons = modules.flatMap(lessonsOf);
  const activeLessonId = lessonId || courseData.currentLesson.lessonId;
  const lessonKey = courseData.currentLesson.lessonId ?? activeLessonId;

  const liveFor = live && live.base === courseData ? live : null;
  const overall = liveFor ? liveFor.overall : (courseData.progressPercent ?? 0);
  const completedIds = liveFor ? liveFor.completed : [];

  const displayModules = completedIds.length === 0 ? modules : modules.map((m) => {
    const lessons = lessonsOf(m).map((l) => (completedIds.includes(l.lessonId) ? { ...l, isCompleted: true } : l));
    return { ...m, lessons, completedLessonCount: lessons.filter((l) => l.isCompleted).length };
  });

  const currentModule = modules.find((m) => lessonsOf(m).some((l) => l.lessonId === activeLessonId)) || modules[0];
  const lessonIndexInModule = currentModule ? lessonsOf(currentModule).findIndex((l) => l.lessonId === activeLessonId) : -1;
  const currentLessonNumber = lessonIndexInModule >= 0 ? lessonIndexInModule + 1 : 1;
  const flatIndex = allLessons.findIndex((l) => l.lessonId === activeLessonId);
  const lessonCompleted = completedIds.includes(activeLessonId)
    || Boolean(allLessons.find((l) => l.lessonId === activeLessonId)?.isCompleted);

  const saveProgress = useCallback(async (id, percent = 100) => {
    const seq = ++saveSeq.current;
    clearTimeout(savedTimer.current);
    setSave({ status: 'saving', lessonId: id });
    try {
      const result = await api.put(`/coursecontent/lessons/${id}/progress`, { lessonId: id, progressPercent: percent });
      if (seq !== saveSeq.current) return true;
      const total = allLessons.length || courseData.totalLessons || 0;
      const index = allLessons.findIndex((l) => l.lessonId === activeLessonId);
      setLive((prev) => {
        const base = prev && prev.base === courseData ? prev : { base: courseData, overall: courseData.progressPercent ?? 0, completed: [] };
        const nextOverall = Number.isFinite(result?.overallProgressPercent)
          ? Math.min(100, Math.max(base.overall, result.overallProgressPercent))
          : computeOverallProgress(base.overall, index, total, percent);
        const completed = percent >= 100 && !base.completed.includes(activeLessonId)
          ? [...base.completed, activeLessonId]
          : base.completed;
        return { base: courseData, overall: nextOverall, completed };
      });
      setSave({ status: 'saved', lessonId: id });
      savedTimer.current = setTimeout(() => setSave({ status: 'idle', lessonId: null }), SAVED_INDICATION_MS);
      if (result?.certificateId) {
        showToast('Course complete — your certificate is ready.', 'certificate');
      }
      return true;
    } catch (err) {
      if (err?.name === 'AbortError' || seq !== saveSeq.current) return false;
      // The meter and the current lesson are intentionally left as they were.
      setSave({ status: 'error', lessonId: id, message: err?.message });
      return false;
    }
  }, [activeLessonId, allLessons, courseData, showToast]);

  const handleLessonClick = (id) => {
    setOutlineOpen(false);
    navigate(`/courses/${courseId}/learn/${id}`);
  };

  const outline = (
    <ModuleOutline modules={displayModules} currentLessonId={activeLessonId} onLessonClick={handleLessonClick} />
  );
  const notes = (
    <LessonResources
      media={courseData.currentLesson.media}
      lessonId={courseData.currentLesson.lessonId}
      courseId={courseData.courseId}
    />
  );

  const drawerOpen = outlineOpen && mode === 'narrow';
  const sheetOpen = notesOpen && mode === 'medium';

  return (
    <>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <button type="button" className={styles.crumb} onClick={() => navigate('/dashboard')}>My pathway</button>
        <span className={styles.crumbSep} aria-hidden="true">/</span>
        <button type="button" className={styles.crumb} onClick={() => navigate('/courses')}>Courses</button>
        <span className={styles.crumbSep} aria-hidden="true">/</span>
        <span aria-current="page">{courseData.courseName}</span>
      </nav>

      <div className={styles.header}>
        <button type="button" className={styles.iconButton} onClick={() => navigate('/courses')} aria-label="Back to courses">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className={styles.headerInfo}>
          <p className={styles.courseName}>{courseData.courseName}</p>
          <h1 className={styles.lessonName}>{courseData.currentLesson.name}</h1>
        </div>
        <div className={styles.progress}>
          <span className={styles.progressText}>{overall}% complete</span>
          <LiquidMeter className={styles.meter} label="Course progress" value={overall} tone="primary" />
        </div>
      </div>

      <div className={styles.statusRow}>
        {save.status === 'saving' && (
          <span className={styles.saving} role="status">
            <Loader2 size={14} aria-hidden="true" /> Saving progress…
          </span>
        )}
        {save.status === 'saved' && (
          <span className={styles.saved} role="status">
            <Check size={14} aria-hidden="true" /> Progress saved
          </span>
        )}
        {save.status === 'error' && (
          <span className={styles.failed} role="alert">
            <AlertTriangle size={14} aria-hidden="true" /> Progress not saved
            <button type="button" className={styles.retryNote} onClick={() => saveProgress(save.lessonId ?? lessonKey, 100)}>
              Retry
            </button>
          </span>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.complete}`}
          disabled={save.status === 'saving' || lessonCompleted}
          onClick={() => saveProgress(lessonKey, 100)}
        >
          <Check size={16} aria-hidden="true" /> {lessonCompleted ? 'Lesson completed' : 'Mark lesson complete'}
        </button>
      </div>

      {(mode === 'narrow' || mode === 'medium') && (
        <div className={styles.controls}>
          {mode === 'narrow' && (
            <button
              type="button"
              className={styles.control}
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              onClick={() => setOutlineOpen(true)}
            >
              <ListTree size={16} aria-hidden="true" /> Course outline
            </button>
          )}
          {mode === 'medium' && (
            <button
              type="button"
              className={styles.control}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              onClick={() => setNotesOpen(true)}
            >
              <MessageSquare size={16} aria-hidden="true" /> Notes &amp; discussion
            </button>
          )}
        </div>
      )}

      <div className={styles.layout} data-mode={mode}>
        {mode !== 'narrow' && <aside className={styles.outlinePane} aria-label="Course outline">{outline}</aside>}

        <section className={styles.lessonPane} aria-label="Lesson">
          <VideoPlayer
            media={courseData.currentLesson.media}
            lessonName={courseData.currentLesson.name}
            totalLessons={courseData.totalLessons}
            currentIndex={flatIndex >= 0 ? flatIndex : 0}
            lessonId={courseData.currentLesson.lessonId}
            onLessonEnded={() => saveProgress(lessonKey, 100)}
          />
          <LessonContent
            lesson={courseData.currentLesson}
            moduleNumber={currentModule?.moduleNumber ?? 1}
            lessonNumber={currentLessonNumber}
          />
        </section>

        {(mode === 'wide' || mode === 'narrow') && (
          <aside className={styles.notesPane} aria-label="Notes and discussion">{notes}</aside>
        )}
      </div>

      {drawerOpen && (
        <Overlay kind="drawer" label="Course outline" onClose={() => setOutlineOpen(false)}>
          {outline}
        </Overlay>
      )}
      {sheetOpen && (
        <Overlay kind="sheet" label="Notes & discussion" onClose={() => setNotesOpen(false)}>
          {notes}
        </Overlay>
      )}
    </>
  );
}
