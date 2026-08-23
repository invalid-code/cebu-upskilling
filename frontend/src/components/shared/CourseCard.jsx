import { useState } from 'react';
import Tag from '../ui/Tag';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import { useToast } from '../../context/ToastContext';
import { useEnrollments } from '../../context/EnrollmentsContext';
import { api } from '../../api/client';
import { Play, Check, Code, BookOpen, Users, Clock, Award } from 'lucide-react';

const styles = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-lg)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  iconCode: {
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
  },
  iconTeal: {
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
  },
  iconGreen: {
    background: 'rgb(210, 240, 220)',
    color: 'var(--good)',
  },
  iconPurple: {
    background: '#e8dff0',
    color: '#7c3aed',
  },
  tags: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 4,
  },
  provider: {
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.5,
    marginBottom: 14,
    flex: 1,
  },
  stats: {
    display: 'flex',
    gap: 14,
    fontSize: 12,
    color: 'var(--muted)',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  statRating: {
    color: 'var(--coral)',
    fontWeight: 700,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: 'var(--muted)',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--ink)',
  },
  actionButton: {
    width: '100%',
    marginTop: 'auto',
  },
};

const iconVariants = {
  code: styles.iconCode,
  teal: styles.iconTeal,
  green: styles.iconGreen,
  purple: styles.iconPurple,
};

export default function CourseCard({
  course,
  _variant = 'recommended',
  iconVariant = 'code',
  tags = [],
  isEnrolled = false,
  progressPercent = 0,
  currentModule = null,
  totalModules = 0,
  rating = 4.5,
  studentCount = 1000,
  isCompleted = false,
  onStart,
  onResume,
  onViewCertificate,
}) {
  const { showToast } = useToast();
  const { refreshEnrollments } = useEnrollments();
  const [enrolling, setEnrolling] = useState(false);

  const handleEnroll = async () => {
    if (!course.courseId) {
      showToast('Course not available for enrollment');
      return;
    }
    setEnrolling(true);
    try {
      await api.post('/enrollments', { courseId: course.courseId });
      refreshEnrollments();
      showToast('Course added to your pathway');
      if (onStart) onStart();
    } catch (err) {
      showToast(err.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const formatStudentCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const getIconContent = () => {
    if (iconVariant === 'code') return <Code size={20} />;
    if (iconVariant === 'green') return <Award size={20} />;
    if (iconVariant === 'purple') return <Play size={20} />;
    return <BookOpen size={20} />;
  };

  return (
    <article style={styles.card}>
      <div style={styles.header}>
        <div style={{ ...styles.iconWrap, ...iconVariants[iconVariant] }}>
          {getIconContent()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.tags}>
            {tags.map((tag) => (
              <Tag key={tag.label} variant={tag.variant || 'default'}>{tag.label}</Tag>
            ))}
          </div>
          <div style={styles.title}>{course.name}</div>
          <div style={styles.provider}>{course.provider}</div>
        </div>
      </div>

      {course.description && (
        <div style={styles.description}>{course.description}</div>
      )}

      <div style={styles.stats}>
        <span style={{ ...styles.statItem, ...styles.statRating }}>
          <span style={{ fontSize: 14 }}>★</span> {rating.toFixed(1)}
        </span>
        <span style={styles.statItem}>
          <Users size={14} /> {formatStudentCount(studentCount)}
        </span>
        <span style={styles.statItem}>
          <Clock size={14} /> {course.technicalLevel || course.duration || 'TBD'}h
        </span>
        <span style={styles.statItem}>
          <BookOpen size={14} /> {course.lessonCount || totalModules || 0} modules
        </span>
      </div>

      {isEnrolled && !isCompleted && (
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <span style={styles.progressLabel}>
              {currentModule ? `${currentModule} · ${course.name}` : course.name}
            </span>
            <span style={styles.progressPercent}>{progressPercent}%</span>
          </div>
          <ProgressBar percent={progressPercent} color="var(--teal)" />
        </div>
      )}

      {isCompleted && (
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <span style={styles.progressLabel}>Completed</span>
            <span style={styles.progressPercent}>100%</span>
          </div>
          <ProgressBar percent={100} color="var(--teal)" />
        </div>
      )}

      <div style={styles.actionButton}>
        {isCompleted ? (
          <Button variant="secondary" onClick={onViewCertificate} style={{ width: '100%' }}>
            <Check size={16} /> View certificate
          </Button>
        ) : isEnrolled && progressPercent > 0 ? (
          <Button variant="primary" onClick={onResume} style={{ width: '100%' }}>
            <Play size={16} /> Resume
          </Button>
        ) : isEnrolled ? (
          <Button variant="primary" onClick={onStart} style={{ width: '100%' }}>
            <Play size={16} /> Start
          </Button>
        ) : (
          <Button variant="primary" onClick={handleEnroll} disabled={enrolling} style={{ width: '100%' }}>
            {enrolling ? 'Enrolling...' : '→ Enroll free'}
          </Button>
        )}
      </div>
    </article>
  );
}
