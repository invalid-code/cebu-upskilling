import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ModuleOutline from '../components/shared/ModuleOutline';
import LessonContent from '../components/shared/LessonContent';
import LessonResources from '../components/shared/LessonResources';
import VideoPlayer from '../components/shared/VideoPlayer';
import ProgressBar from '../components/ui/ProgressBar';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const styles = {
  container: {
    animation: 'enter 0.35s var(--ease)',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 20,
  },
  breadcrumbLink: {
    color: 'var(--teal)',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  breadcrumbSeparator: {
    color: 'var(--line)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    color: 'var(--ink)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },
  headerInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 14,
    color: 'var(--muted)',
    marginBottom: 2,
  },
  lessonName: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--ink)',
  },
  progressSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--ink)',
  },
  progressBarContainer: {
    width: 120,
  },
  content: {
    display: 'flex',
    gap: 24,
  },
  leftSidebar: {
    width: 280,
    flexShrink: 0,
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
  },
  rightSidebar: {
    width: 280,
    flexShrink: 0,
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: 'var(--muted)',
    fontSize: 14,
  },
};

export default function CourseContentPage() {
  useAuth();
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const fetchCourseContent = async () => {
      try {
        const url = lessonId
          ? `/coursecontent/courses/${courseId}/content?lessonId=${lessonId}`
          : `/coursecontent/courses/${courseId}/content`;
        const data = await api.get(url, { signal: controller.signal });
        setCourseData(data);
        // When starting/resuming without a lessonId, the backend now returns the first unfinished lesson.
        // Update the URL to reflect that lesson so deep-linking and refresh work correctly.
        if (!lessonId && data?.currentLesson?.lessonId) {
          navigate(`/courses/${courseId}/learn/${data.currentLesson.lessonId}`, { replace: true });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Could not load course content');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCourseContent();
    return () => controller.abort();
  }, [courseId, lessonId, navigate]);

  const handleLessonClick = (id) => {
    navigate(`/courses/${courseId}/learn/${id}`);
  };

  const handleBack = () => {
    navigate('/courses');
  };

  if (loading) {
    return <div style={styles.loading}>Loading course content...</div>;
  }

  if (error || !courseData) {
    return (
      <div style={styles.loading}>
        {error || 'Course not found'}
      </div>
    );
  }

  const currentModule = courseData.modules.find(m =>
    m.lessons.some(l => l.lessonId === parseInt(lessonId))
  ) || courseData.modules[0];
  const currentLessonIndex = courseData.modules.findIndex(m =>
    m.lessons.some(l => l.lessonId === parseInt(lessonId))
  );
  const currentModuleNumber = currentModule?.moduleNumber ?? 1;
  const lessonIndexInModule = currentModule?.lessons.findIndex(l => l.lessonId === parseInt(lessonId)) ?? -1;
  const currentLessonNumber = lessonIndexInModule >= 0 ? lessonIndexInModule + 1 : 1;

  return (
    <div style={styles.container}>
      <div style={styles.breadcrumb}>
        <span style={styles.breadcrumbLink} onClick={() => navigate('/dashboard')}>
          My pathway
        </span>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span style={styles.breadcrumbLink} onClick={() => navigate('/courses')}>
          Courses
        </span>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span>{courseData.courseName}</span>
      </div>

      <div style={styles.header}>
        <button style={styles.backButton} onClick={handleBack}>
          <ArrowLeft size={18} />
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.courseName}>{courseData.courseName}</div>
          <div style={styles.lessonName}>{courseData.currentLesson.name}</div>
        </div>
        <div style={styles.progressSection}>
          <span style={styles.progressText}>
            {courseData.progressPercent}% complete
          </span>
          <div style={styles.progressBarContainer}>
            <ProgressBar percent={courseData.progressPercent} color="var(--coral)" />
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.leftSidebar}>
          <ModuleOutline
            modules={courseData.modules}
            currentLessonId={parseInt(lessonId)}
            onLessonClick={handleLessonClick}
          />
        </div>

        <div style={styles.mainContent}>
          <VideoPlayer
            media={courseData.currentLesson.media}
            lessonName={courseData.currentLesson.name}
            totalLessons={courseData.totalLessons}
            currentIndex={currentLessonIndex >= 0 ? currentLessonIndex : 0}
          />
          <LessonContent
            lesson={courseData.currentLesson}
            moduleNumber={currentModuleNumber}
            lessonNumber={currentLessonNumber}
          />
        </div>

        <div style={styles.rightSidebar}>
          <LessonResources
            media={courseData.currentLesson.media}
            lessonId={courseData.currentLesson.lessonId}
            courseId={courseData.courseId}
          />
        </div>
      </div>
    </div>
  );
}
