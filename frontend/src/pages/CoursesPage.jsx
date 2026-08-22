import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CourseCard from '../components/shared/CourseCard';
import CourseDetailPanel from '../components/shared/CourseDetailPanel';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { api } from '../api/client';
import { Flame, CheckCircle, Award, ArrowRight } from 'lucide-react';

const styles = {
  heading: {
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 700,
    color: 'var(--muted)',
    marginBottom: 12,
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
  statIconCoral: {
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
  },
  statIconTeal: {
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
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
  myLearningLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--teal)',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
    marginBottom: 40,
  },
  courseGridThree: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  filterTabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterTab: {
    padding: '8px 16px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid var(--line)',
    background: 'var(--surface)',
    color: 'var(--muted)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterTabActive: {
    background: 'var(--teal)',
    color: 'var(--surface)',
    borderColor: 'var(--teal)',
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
  empty: {
    padding: 45,
    textAlign: 'center',
    border: '1px dashed var(--line)',
    borderRadius: 15,
    background: 'var(--surface)',
    color: 'var(--muted)',
    fontSize: 13,
  },
};

const DEFAULT_CATEGORY_TABS = ['All', 'Frontend', 'Languages', 'Tooling', 'Career'];

function mapSkillCategoryToTab(category) {
  if (!category) return null;
  const lower = category.trim().toLowerCase();
  if (lower === 'language') return 'Languages';
  if (lower === 'languages') return 'Languages';
  if (lower === 'framework') return 'Frontend';
  if (lower === 'tool') return 'Tooling';
  if (lower === 'tooling') return 'Tooling';
  if (lower === 'runtime') return 'Tooling';
  if (lower === 'platform') return 'Tooling';
  if (lower === 'concept') return 'Career';
  if (lower === 'career') return 'Career';
  if (lower === 'frontend') return 'Frontend';
  if (lower === 'backend') return 'Backend';
  // Fallback: capitalize
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function getTabOrderIndex(tab) {
  const order = ['Frontend', 'Backend', 'Languages', 'Tooling', 'Career'];
  const idx = order.indexOf(tab);
  return idx === -1 ? 999 : idx;
}
export default function CoursesPage() {
  const { user } = useAuth();
  let applications = [];
  try {
    const ctx = useApplications();
    applications = ctx?.applications || [];
  } catch {
    applications = [];
  }
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [dayStreak, setDayStreak] = useState(0);
  const [coursesInProgress, setCoursesInProgress] = useState(0);
  const [certificatesEarned, setCertificatesEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [categoryTabs, setCategoryTabs] = useState(DEFAULT_CATEGORY_TABS);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/coursespage', { signal: controller.signal })
      .then((data) => {
        setEnrolledCourses(data.enrolledCourses || []);
        setRecommendedCourses(data.recommendedCourses || []);
        setDayStreak(data.dayStreak || 0);
        setCoursesInProgress(data.coursesInProgress || 0);
        setCertificatesEarned(data.certificatesEarned || 0);
        const available = Array.isArray(data.availableCategories) ? data.availableCategories : [];
        setCategoryTabs(['All', ...available]);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(err.message || 'Could not load courses');
        setEnrolledCourses([]);
        setRecommendedCourses([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const profileTargetRole = user?.targetRole?.trim() || '';
    const appliedTargetRole = applications.find((a) => a.targetRole?.trim())?.targetRole?.trim() || '';
    const resolvedTargetRole = appliedTargetRole || profileTargetRole;
    const controller = new AbortController();

    const applyTabsFromCategories = (rawCategories) => {
      if (!rawCategories || rawCategories.length === 0) return;
      const mapped = [...new Set(rawCategories.map(mapSkillCategoryToTab).filter(Boolean))];
      if (mapped.length === 0) return;
      const sorted = mapped.sort((a, b) => getTabOrderIndex(a) - getTabOrderIndex(b));
      const nextTabs = ['All', ...sorted];
      setCategoryTabs((prev) => {
        if (prev.length === nextTabs.length && prev.every((v, i) => v === nextTabs[i])) return prev;
        return nextTabs;
      });
      setActiveCategory((prev) => (nextTabs.includes(prev) ? prev : 'All'));
    };

    if (resolvedTargetRole) {
      api.get('/skillgaps', { signal: controller.signal })
        .then((groups) => {
          if (!Array.isArray(groups)) return;
          const group = groups.find((g) => {
            const role = (g.role ?? g.Role ?? '').trim();
            return role.toLowerCase() === resolvedTargetRole.toLowerCase();
          });
          if (!group) return;
          const gaps = group.gaps ?? group.Gaps ?? [];
          if (!Array.isArray(gaps) || gaps.length === 0) return;
          const rawCategories = [...new Set(gaps.map((g) => (g.category ?? g.Category ?? '').trim()).filter(Boolean))];
          applyTabsFromCategories(rawCategories);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
        });
    } else {
      // No target role: categorize based on the field a skill belongs to (Skill.Category)
      api.get('/skills', { signal: controller.signal })
        .then((skills) => {
          if (!Array.isArray(skills) || skills.length === 0) return;
          const rawCategories = [...new Set(skills.map((s) => (s.category ?? s.Category ?? '').trim()).filter(Boolean))];
          applyTabsFromCategories(rawCategories);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
        });
    }
    return () => controller.abort();
  }, [user?.targetRole, applications]);

  const filteredRecommended = recommendedCourses.filter((course) => {
    if (activeCategory === 'All') return true;
    return course.skillCategory === activeCategory;
  });

  const handleOpenCourseDetail = async (courseId) => {
    try {
      const data = await api.get(`/courses/${courseId}/detail`);
      setSelectedCourse(data);
    } catch (err) {
      console.error('Failed to load course details:', err);
    }
  };

  const handleCloseCourseDetail = () => {
    setSelectedCourse(null);
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
      const data = await api.get(`/coursecontent/courses/${courseId}/content`);
      const firstUnfinished = data.modules?.flatMap((m) => m.lessons).find((l) => !l.isCompleted);
      if (firstUnfinished) {
        navigate(`/courses/${courseId}/learn/${firstUnfinished.lessonId}`);
        return;
      }
      // If all lessons done, fall back to first lesson of first module
      const fallback = data.modules?.[0]?.lessons?.[0];
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
    if (lessonId) {
      navigate(`/courses/${courseId}/learn/${lessonId}`);
    } else {
      navigate(`/courses/${courseId}/learn`);
    }
  };

  const handleEnroll = () => {
    setLoading(true);
    api.get('/coursespage')
      .then((data) => {
        setEnrolledCourses(data.enrolledCourses || []);
        setRecommendedCourses(data.recommendedCourses || []);
        setDayStreak(data.dayStreak || 0);
        setCoursesInProgress(data.coursesInProgress || 0);
        setCertificatesEarned(data.certificatesEarned || 0);
        const available = Array.isArray(data.availableCategories) ? data.availableCategories : [];
        setCategoryTabs(['All', ...available]);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div style={styles.eyebrow}>Learn the skills your matches need</div>
        <h1 style={styles.h1}>Courses</h1>
        <p style={styles.subtitle}>
          Every course is picked to close a real gap in your skill profile. Finish one, verify it
          with an assessment, and watch your job match climb.
        </p>
      </div>

      {!loading && (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, ...styles.statIconCoral }}>
              <Flame size={22} />
            </div>
            <div>
              <div style={styles.statValue}>{dayStreak}</div>
              <div style={styles.statLabel}>Day learning streak</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, ...styles.statIconTeal }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <div style={styles.statValue}>{coursesInProgress}</div>
              <div style={styles.statLabel}>Courses in progress</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, ...styles.statIconGood }}>
              <Award size={22} />
            </div>
            <div>
              <div style={styles.statValue}>{certificatesEarned}</div>
              <div style={styles.statLabel}>Certificates earned</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Loading courses...</div>
      ) : (
        <>
          {enrolledCourses.length > 0 && (
            <div>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Continue learning</h2>
                <span style={styles.myLearningLink}>
                  My learning <ArrowRight size={16} />
                </span>
              </div>
              <div style={styles.courseGrid}>
                {enrolledCourses.map((enrollment) => (
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
                    tags={[
                      { label: 'Certificate', variant: 'default' },
                    ]}
                    isEnrolled={true}
                    progressPercent={enrollment.progressPercent}
                    currentModule={enrollment.currentModule}
                    totalModules={enrollment.totalModules}
                    onStart={() => handleOpenCourseDetail(enrollment.courseId)}
                    onResume={() => handleOpenCourseDetail(enrollment.courseId)}
                  />
                ))}
              </div>
            </div>
          )}

          <div id="recommended-courses">
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recommended for your pathway</h2>
              <div style={styles.filterTabs}>
                {categoryTabs.map((tab) => (
                  <button
                    key={tab}
                    style={{
                      ...styles.filterTab,
                      ...(activeCategory === tab ? styles.filterTabActive : {}),
                    }}
                    onClick={() => setActiveCategory(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.courseGridThree}>
              {filteredRecommended.length === 0 ? (
                <div style={{ ...styles.empty, gridColumn: '1 / -1' }}>
                  No courses match this category.
                </div>
              ) : (
                filteredRecommended.map((course) => (
                  <CourseCard
                    key={course.courseId}
                    course={course}
                    variant="recommended"
                    iconVariant={
                      course.category === 'Frontend' ? 'code' :
                      course.category === 'Languages' ? 'teal' :
                      course.category === 'Tooling' ? 'purple' : 'green'
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
                    onStart={handleEnroll}
                    onResume={() => handleOpenCourseDetail(course.courseId)}
                    onViewCertificate={() => {}}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}

      {!loading && enrolledCourses.length === 0 && recommendedCourses.length === 0 && (
        <div style={styles.empty}>
          {error
            ? `Couldn't load courses. Check back later.`
            : 'No courses available yet. Enroll in courses to start learning.'}
        </div>
      )}

      {selectedCourse && (
        <CourseDetailPanel
          course={selectedCourse}
          onClose={handleCloseCourseDetail}
          onResume={handleResumeFromPanel}
          onModuleClick={handleModuleClickFromPanel}
        />
      )}
    </div>
  );
}
