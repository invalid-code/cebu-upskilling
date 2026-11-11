import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Flame, CheckCircle, Award } from 'lucide-react';
import CourseCard from '../components/shared/CourseCard';
import CourseDetailPanel from '../components/shared/CourseDetailPanel';
import EmptyState from '../components/shared/EmptyState';
import DataBoundView from '../components/ui/DataBoundView';
import Skeleton, { SkeletonCard } from '../components/ui/Skeleton';
import useDataState from '../hooks/useDataState';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import styles from './CoursesPage.module.css';

/** The continue-learning strip lists between 1 and 10 in-progress courses. */
const MAX_CONTINUE_LEARNING = 10;

const NO_APPLICATIONS = [];
const TAB_ORDER = ['Frontend', 'Backend', 'Languages', 'Tooling', 'Career'];

const TAB_BY_CATEGORY = {
  language: 'Languages',
  languages: 'Languages',
  framework: 'Frontend',
  frontend: 'Frontend',
  tool: 'Tooling',
  tooling: 'Tooling',
  runtime: 'Tooling',
  platform: 'Tooling',
  concept: 'Career',
  career: 'Career',
  backend: 'Backend',
};

function mapSkillCategoryToTab(category) {
  if (!category) return null;
  const trimmed = category.trim();
  return TAB_BY_CATEGORY[trimmed.toLowerCase()] || (trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
}

function getTabOrderIndex(tab) {
  const idx = TAB_ORDER.indexOf(tab);
  return idx === -1 ? 999 : idx;
}

const sameText = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

/** True when the recommended course belongs to the selected category tab ("All" matches everything). */
function matchesCategory(course, active) {
  if (!active || active === 'All') return true;
  return sameText(course.skillCategory, active) || mapSkillCategoryToTab(course.skillCategory) === active;
}

function accessTime(enrollment) {
  const raw = enrollment?.lastAccessed ?? enrollment?.lastOnline ?? enrollment?.started;
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(t) ? -Infinity : t;
}

/**
 * In-progress (not yet 100%) enrollments, most recently accessed first, at most 10.
 * Ties and missing dates keep the API order.
 */
function selectContinueLearning(enrolledCourses) {
  return (Array.isArray(enrolledCourses) ? enrolledCourses : [])
    .map((course, index) => ({ course, index }))
    .filter(({ course }) => !(course?.progressPercent >= 100))
    .sort((a, b) => {
      const diff = accessTime(b.course) - accessTime(a.course);
      return diff !== 0 && !Number.isNaN(diff) ? diff : a.index - b.index;
    })
    .slice(0, MAX_CONTINUE_LEARNING)
    .map(({ course }) => course);
}

const isCompletedEnrollment = (course) => course?.progressPercent >= 100;

/**
 * Loading placeholder. Deliberately a single "recommended" section (the Continue learning strip is omitted when
 * the learner has nothing in progress), so the skeleton never grows taller than the loaded page's reserved area
 * and the footer does not shift when data arrives.
 */
function CoursesSkeleton() {
  return (
    <div>
      <div className={styles.statsRow}>
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonCard key={i} minHeight={92} style={{ padding: 20 }} />
        ))}
      </div>
      <div className={styles.skeletonBlock}>
        <Skeleton height={20} width={230} radius={8} style={{ marginBottom: 14 }} />
        <div className={styles.grid}>
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i} minHeight={210} style={{ padding: 20 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const hasNoCourses = (data) =>
  !data
  || ((data.enrolledCourses || []).length === 0 && (data.recommendedCourses || []).length === 0);

export default function CoursesPage() {
  const { user } = useAuth();
  let applications = NO_APPLICATIONS;
  try {
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useApplications();
    applications = ctx?.applications || NO_APPLICATIONS;
  } catch {
    applications = NO_APPLICATIONS;
  }
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [derivedTabs, setDerivedTabs] = useState(null);
  const [refreshed, setRefreshed] = useState(null);

  const state = useDataState(({ signal }) => api.get('/coursespage', { signal }), []);

  // A silent refresh (after enrolling) replaces the data without flashing the skeleton.
  const data = refreshed && refreshed.base === state.data ? refreshed.value : state.data;

  const refreshSilently = () => {
    const base = state.data;
    api.get('/coursespage')
      .then((value) => setRefreshed({ base, value }))
      .catch(() => { /* keep the data already on screen */ });
  };

  // Category tabs follow the learner's target role (gap categories) or, without one, the skill categories.
  useEffect(() => {
    const profileTargetRole = user?.targetRole?.trim() || '';
    const appliedTargetRole = applications.find((a) => a.targetRole?.trim())?.targetRole?.trim() || '';
    const resolvedTargetRole = appliedTargetRole || profileTargetRole;
    const controller = new AbortController();

    const applyTabsFromCategories = (rawCategories) => {
      if (!rawCategories || rawCategories.length === 0) return;
      const mapped = [...new Set(rawCategories.map(mapSkillCategoryToTab).filter(Boolean))];
      if (mapped.length === 0) return;
      const nextTabs = mapped.sort((a, b) => getTabOrderIndex(a) - getTabOrderIndex(b));
      setDerivedTabs((prev) => (
        prev && prev.length === nextTabs.length && prev.every((v, i) => v === nextTabs[i]) ? prev : nextTabs
      ));
    };

    const ignoreAbort = (err) => { if (err?.name === 'AbortError') return; };

    if (resolvedTargetRole) {
      api.get('/skillgaps', { signal: controller.signal })
        .then((groups) => {
          if (!Array.isArray(groups)) return;
          const group = groups.find((g) => sameText(g.role ?? g.Role, resolvedTargetRole));
          const gaps = group?.gaps ?? group?.Gaps ?? [];
          if (!Array.isArray(gaps) || gaps.length === 0) return;
          applyTabsFromCategories([...new Set(gaps.map((g) => (g.category ?? g.Category ?? '').trim()).filter(Boolean))]);
        })
        .catch(ignoreAbort);
    } else {
      api.get('/skills', { signal: controller.signal })
        .then((skills) => {
          if (!Array.isArray(skills) || skills.length === 0) return;
          applyTabsFromCategories([...new Set(skills.map((s) => (s.category ?? s.Category ?? '').trim()).filter(Boolean))]);
        })
        .catch(ignoreAbort);
    }
    return () => controller.abort();
  }, [user?.targetRole, applications]);

  // The category filter lives in the URL (?category=...), which "Close gap" links to.
  const urlCategory = searchParams.get('category')?.trim() || '';
  const baseTabs = useMemo(() => {
    const available = Array.isArray(data?.availableCategories) ? data.availableCategories : [];
    return derivedTabs ?? available;
  }, [derivedTabs, data?.availableCategories]);
  const tabs = useMemo(() => {
    const list = ['All', ...baseTabs.filter((t) => t !== 'All')];
    if (urlCategory && !list.some((t) => sameText(t, urlCategory))) list.push(urlCategory);
    return list;
  }, [baseTabs, urlCategory]);
  const activeCategory = urlCategory ? (tabs.find((t) => sameText(t, urlCategory)) || 'All') : 'All';

  const selectCategory = (tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'All') next.delete('category');
      else next.set('category', tab);
      return next;
    }, { replace: true });
  };

  const handleOpenCourseDetail = async (courseId) => {
    try {
      setSelectedCourse(await api.get(`/courses/${courseId}/detail`));
    } catch (err) {
      showToast(err.message || 'Could not load course details', 'error');
    }
  };

  const handleResumeFromPanel = async (courseId) => {
    const course = selectedCourse;
    // Ensure enrollment exists before trying to resolve first unfinished lesson
    if (course && !course.isEnrolled) {
      try {
        await api.post('/enrollments', { courseId });
      } catch {
        // ignore enrollment errors, still try to navigate
      }
    }
    setSelectedCourse(null);
    try {
      const content = await api.get(`/coursecontent/courses/${courseId}/content`);
      const firstUnfinished = content.modules?.flatMap((m) => m.lessons).find((l) => !l.isCompleted);
      if (firstUnfinished) {
        navigate(`/courses/${courseId}/learn/${firstUnfinished.lessonId}`);
        return;
      }
      // If all lessons done, fall back to first lesson of first module
      const fallback = content.modules?.[0]?.lessons?.[0];
      if (fallback) {
        navigate(`/courses/${courseId}/learn/${fallback.lessonId}`);
        return;
      }
    } catch {
      // fall back to generic learn route, backend will resolve first unfinished
    }
    navigate(`/courses/${courseId}/learn`);
  };

  const handleModuleClickFromPanel = async (module) => {
    if (!selectedCourse) return;
    const lessons = module.lessons || module.Lessons || [];
    const firstLesson = lessons[0];
    const lessonId = firstLesson?.lessonId ?? firstLesson?.LessonId;
    const courseId = selectedCourse.courseId;
    if (!selectedCourse.isEnrolled) {
      try {
        await api.post('/enrollments', { courseId });
      } catch {
        // ignore enrollment errors
      }
    }
    setSelectedCourse(null);
    navigate(lessonId ? `/courses/${courseId}/learn/${lessonId}` : `/courses/${courseId}/learn`);
  };

  const handleViewCertificate = (certificateId) => {
    navigate(certificateId ? `/credentials/${certificateId}` : '/credentials');
  };

  const boundState = { ...state, data };

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Learn the skills your matches need</p>
        <h1 className={styles.title}>Courses</h1>
        <p className={styles.subtitle}>
          Every course is picked to close a real gap in your skill profile. Finish one, verify it
          with an assessment, and watch your job match climb.
        </p>
      </div>

      <DataBoundView
        state={boundState}
        skeleton={<CoursesSkeleton />}
        loadingLabel="Loading courses..."
        errorTitle="Couldn’t load courses"
        isEmpty={hasNoCourses}
        empty={{
          title: 'Nothing to learn yet',
          description: 'No courses available yet. Enroll in courses to start learning.',
        }}
      >
        {(page) => (
          <CoursesBody
            data={page}
            tabs={tabs}
            activeCategory={activeCategory}
            onSelectCategory={selectCategory}
            onEnrolled={refreshSilently}
            onOpenDetail={handleOpenCourseDetail}
            onViewCertificate={handleViewCertificate}
          />
        )}
      </DataBoundView>

      {selectedCourse && (
        <CourseDetailPanel
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onResume={handleResumeFromPanel}
          onModuleClick={handleModuleClickFromPanel}
        />
      )}
    </div>
  );
}

function CoursesBody({ data, tabs, activeCategory, onSelectCategory, onEnrolled, onOpenDetail, onViewCertificate }) {
  const enrolled = Array.isArray(data.enrolledCourses) ? data.enrolledCourses : [];
  const recommended = Array.isArray(data.recommendedCourses) ? data.recommendedCourses : [];

  const continueLearning = selectContinueLearning(enrolled);
  const completed = enrolled.filter(isCompletedEnrollment);
  const filteredRecommended = recommended.filter((course) => matchesCategory(course, activeCategory));

  return (
    <>
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statCoral}`} aria-hidden="true"><Flame size={22} /></div>
          <div>
            <div className={styles.statValue}>{data.dayStreak || 0}</div>
            <div className={styles.statLabel}>Day learning streak</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statTeal}`} aria-hidden="true"><CheckCircle size={22} /></div>
          <div>
            <div className={styles.statValue}>{data.coursesInProgress || 0}</div>
            <div className={styles.statLabel}>Courses in progress</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statGood}`} aria-hidden="true"><Award size={22} /></div>
          <div>
            <div className={styles.statValue}>{data.certificatesEarned || 0}</div>
            <div className={styles.statLabel}>Certificates earned</div>
          </div>
        </div>
      </div>

      {/* Continue learning is omitted entirely when nothing is in progress; recommended then comes first. */}
      {continueLearning.length > 0 && (
        <section className={styles.section} aria-labelledby="continue-learning">
          <div className={styles.sectionHeader}>
            <h2 id="continue-learning" className={styles.sectionTitle}>Continue learning</h2>
            <span className={styles.count}>{continueLearning.length} in progress</span>
          </div>
          <div className={styles.grid}>
            {continueLearning.map((enrollment) => (
              <CourseCard
                key={enrollment.courseId}
                course={{
                  courseId: enrollment.courseId,
                  name: enrollment.courseName,
                  technicalLevel: enrollment.technicalLevel,
                  lessonCount: enrollment.totalModules,
                }}
                variant="enrolled"
                iconVariant="code"
                tags={[{ label: 'Certificate', variant: 'default' }]}
                isEnrolled
                isCompleted={false}
                certificateId={enrollment.certificateId}
                progressPercent={enrollment.progressPercent}
                currentModule={enrollment.currentModule}
                totalModules={enrollment.totalModules}
                onStart={() => onOpenDetail(enrollment.courseId)}
                onResume={() => onOpenDetail(enrollment.courseId)}
                onViewCertificate={() => onViewCertificate(enrollment.certificateId)}
              />
            ))}
          </div>
        </section>
      )}

      <section id="recommended-courses" className={styles.section} aria-labelledby="recommended-heading">
        <div className={styles.sectionHeader}>
          <h2 id="recommended-heading" className={styles.sectionTitle}>Recommended for your pathway</h2>
          <div className={styles.filters} role="group" aria-label="Filter by category">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.filter} ${activeCategory === tab ? styles.filterActive : ''}`}
                aria-pressed={activeCategory === tab}
                onClick={() => onSelectCategory(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.grid}>
          {filteredRecommended.length === 0 ? (
            <div className={styles.noMatch}>
              <EmptyState
                title="No courses match this category."
                action={activeCategory !== 'All' ? { label: 'Show all courses', onClick: () => onSelectCategory('All') } : undefined}
              />
            </div>
          ) : (
            filteredRecommended.map((course) => (
              <CourseCard
                key={course.courseId}
                course={course}
                variant="recommended"
                iconVariant={
                  course.category === 'Frontend' ? 'code'
                    : course.category === 'Languages' ? 'teal'
                      : course.category === 'Tooling' ? 'purple' : 'green'
                }
                tags={[
                  course.isRecommended && { label: 'Recommended', variant: 'coral' },
                  course.isCompleted && { label: 'Completed', variant: 'good' },
                  course.isEnrolled && { label: 'Enrolled', variant: 'default' },
                  !course.isFree && { label: 'Certificate', variant: 'default' },
                ].filter(Boolean)}
                isEnrolled={course.isEnrolled}
                progressPercent={course.progressPercent}
                isCompleted={course.isCompleted}
                certificateId={course.certificateId}
                onStart={onEnrolled}
                onResume={() => onOpenDetail(course.courseId)}
                onViewCertificate={() => onViewCertificate(course.certificateId)}
              />
            ))
          )}
        </div>
      </section>

      {completed.length > 0 && (
        <section className={styles.section} aria-labelledby="completed-heading">
          <div className={styles.sectionHeader}>
            <h2 id="completed-heading" className={styles.sectionTitle}>Completed</h2>
          </div>
          <div className={styles.grid}>
            {completed.map((enrollment) => (
              <CourseCard
                key={enrollment.courseId}
                course={{
                  courseId: enrollment.courseId,
                  name: enrollment.courseName,
                  technicalLevel: enrollment.technicalLevel,
                  lessonCount: enrollment.totalModules,
                }}
                variant="enrolled"
                iconVariant="green"
                isEnrolled
                isCompleted
                certificateId={enrollment.certificateId}
                progressPercent={100}
                onViewCertificate={() => onViewCertificate(enrollment.certificateId)}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
