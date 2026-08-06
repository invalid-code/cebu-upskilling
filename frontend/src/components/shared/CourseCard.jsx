import { useState } from 'react';
import Tag from '../ui/Tag';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useEnrollments } from '../../context/EnrollmentsContext';
import { api } from '../../api/client';

const styles = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 15,
    padding: 17,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 220,
  },
  title: {
    fontSize: 16,
    margin: '12px 0 5px',
  },
  provider: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: '0 0 12px',
  },
  desc: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  meta: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 'auto',
    paddingTop: 14,
    borderTop: '1px solid var(--line)',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: 'var(--muted)',
  },
};

export default function CourseCard({ course, tagVariant = 'default', tagLabel }) {
  const { showToast } = useToast();
  const { isEnrolled, refreshEnrollments } = useEnrollments();
  const [enrolling, setEnrolling] = useState(false);

  const enrolled = isEnrolled(course.courseId);

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
    } catch (err) {
      showToast(err.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <article className="course" style={styles.card}>
      <Tag variant={tagVariant}>{tagLabel || 'Course'}</Tag>
      <h4 style={styles.title}>{course.name}</h4>
      <p style={styles.provider}>
        {course.provider || 'Provider'} · {course.mode || 'Online'}
      </p>
      {course.description && <p style={styles.desc}>{course.description}</p>}
      <div className="meta" style={styles.meta}>
        <span style={styles.metaText}>{course.duration || 'TBD'}</span>
        <span style={styles.metaText}>{course.technicalLevel ? `Level ${course.technicalLevel}` : 'All levels'}</span>
        <Button
          variant="ghost"
          style={{ marginLeft: 'auto', padding: '5px 8px', minHeight: 28 }}
          onClick={handleEnroll}
          disabled={enrolling || enrolled}
        >
          {enrolling ? 'Enrolling...' : enrolled ? 'Enrolled' : 'Enroll'}
        </Button>
      </div>
    </article>
  );
}
