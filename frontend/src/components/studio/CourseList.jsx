import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import DataBoundView from '../ui/DataBoundView';
import Skeleton from '../ui/Skeleton';
import useDataState from '../../hooks/useDataState';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { groupCourses } from './studioModel';
import styles from './CourseStudio.module.css';

function ListSkeleton() {
  return [0, 1, 2].map((i) => (
    <div key={i} className={styles.courseRow}>
      <div>
        <Skeleton height={15} width="45%" style={{ marginBottom: 8 }} />
        <Skeleton height={12} width="60%" />
      </div>
      <Skeleton height={26} width={84} radius={13} />
    </div>
  ));
}

function CourseRow({ course, onDelete }) {
  const published = String(course.status).toLowerCase() === 'published';
  return (
    <li className={styles.courseRow} style={{ listStyle: 'none' }}>
      <div>
        <div className={styles.courseName}>{course.name}</div>
        <div className={styles.courseMeta}>
          {course.moduleCount} modules · {course.lessonCount} lessons · {course.mode}
          {course.issuesCertificate
            ? ` · Certificate${course.certificatesIssued ? ` · ${course.certificatesIssued} issued` : ''}`
            : ''}
        </div>
      </div>
      <span className={`${styles.statusTag} ${published ? styles.statusPublished : styles.statusDraft}`}>
        {published ? 'Published' : 'Draft'}
      </span>
      <div className={styles.rowActions}>
        <Link className={styles.editLink} to={`/company-courses/${course.courseId}/edit`}>Edit course</Link>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => onDelete(course)}
          aria-label={`Delete ${course.name}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function Group({ title, courses, emptyText, onDelete }) {
  return (
    <section className={styles.group} aria-labelledby={`group-${title}`}>
      <h2 id={`group-${title}`} className={styles.sectionTitle}>
        {title} <span className={styles.count}>({courses.length})</span>
      </h2>
      {courses.length === 0 ? (
        <p className={styles.muted}>{emptyText}</p>
      ) : (
        <ul style={{ padding: 0, margin: 'var(--space-3) 0 0' }}>
          {courses.map((c) => <CourseRow key={c.courseId} course={c} onDelete={onDelete} />)}
        </ul>
      )}
    </section>
  );
}

/** The Course Studio landing view: own courses grouped under Draft and Published headings. */
export default function CourseList({ eyebrow }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const state = useDataState(async () => {
    const data = await api.get('/company/courses');
    return Array.isArray(data) ? data : [];
  }, []);
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [conflict, setConflict] = useState(null);

  const confirmDelete = async () => {
    const course = target;
    setDeleting(true);
    try {
      await api.delete(`/company/courses/${course.courseId}`);
      setTarget(null);
      showToast('Course deleted', 'success');
      state.reload();
    } catch (err) {
      setTarget(null);
      if (err?.status === 409) {
        // Learners are enrolled: the course stays listed with its status unchanged.
        setConflict(course);
      } else {
        showToast(err?.message || 'Failed to delete course', 'error');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="view-enter">
      <div className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>{eyebrow}</div>
          <h1 className={styles.title}>Course studio</h1>
          <p className={styles.muted}>Build practical learning paths your team can share with Cebu&apos;s talent.</p>
        </div>
        <Link to="/company-courses/new"><Button><Plus size={16} aria-hidden="true" /> Create course</Button></Link>
      </div>

      <Panel>
        <DataBoundView
          state={state}
          loadingLabel="Loading your curriculum..."
          skeleton={<ListSkeleton />}
          errorTitle="Could not load courses"
          empty={{
            title: 'Start your course library',
            description: 'Create a course, add modules and lessons, then publish it when ready.',
            action: {
              label: 'Create your first course',
              href: '/company-courses/new',
              onClick: (e) => { e.preventDefault(); navigate('/company-courses/new'); },
            },
          }}
        >
          {(courses) => {
            const { draft, published } = groupCourses(courses);
            return (
              <>
                <p className={styles.muted} style={{ marginTop: 0, marginBottom: 'var(--space-5)' }}>
                  {courses.length} courses in your workspace
                </p>
                <Group title="Draft" courses={draft} emptyText="No draft courses." onDelete={setTarget} />
                <Group title="Published" courses={published} emptyText="No published courses yet." onDelete={setTarget} />
              </>
            );
          }}
        </DataBoundView>
      </Panel>

      <Modal
        open={Boolean(target)}
        onClose={() => !deleting && setTarget(null)}
        title="Delete this course?"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="primary" onClick={confirmDelete} loading={deleting}>Delete course</Button>
          </>
        )}
      >
        <p>
          {target ? `“${target.name}” ` : ''}and its modules and lessons will be permanently removed. This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={Boolean(conflict)}
        onClose={() => setConflict(null)}
        title="This course can’t be deleted yet"
        footer={<Button variant="ghost" onClick={() => setConflict(null)}>Got it</Button>}
      >
        <p>
          {conflict ? `Learners are enrolled in “${conflict.name}”, so it was not deleted and is still in your list.` : ''}
        </p>
        <p>
          To retire it, unpublish the course so no new learners can enroll, then delete it once the enrolled learners
          have finished or left.
        </p>
      </Modal>
    </div>
  );
}
