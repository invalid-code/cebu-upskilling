import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Eye, Pencil, Trash2, Layers, CheckCircle2, Clock3, BookOpenCheck,
} from 'lucide-react';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import EmptyState from '../components/shared/EmptyState';
import StatCard from '../components/shared/StatCard';
import BarList from '../components/shared/BarList';
import ErrorState from '../components/ui/ErrorState';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import useDataState from '../hooks/useDataState';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import styles from './ProviderDashboardPage.module.css';

const isPublished = (course) => String(course.status).toLowerCase() === 'published';

async function fetchOwnCourses() {
  try {
    const data = await api.get('/company/courses');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    // 401/403 is shown as an empty library rather than a hard error.
    if (err?.status === 403 || err?.status === 401) return [];
    throw err;
  }
}

function DashboardSkeleton() {
  return (
    <SkeletonStatus label="Loading provider workspace…">
      <Skeleton height={44} width="35%" radius={8} style={{ marginBottom: 24 }} />
      <Panel>
        <div className={styles.statGrid}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} width="100%" radius={14} />)}
        </div>
      </Panel>
      <section className={styles.section}>
        <Skeleton height={28} width={180} radius={8} style={{ marginBottom: 16 }} />
        <ul className={styles.list}>
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.skeletonRow}>
              <Skeleton height={16} width="45%" />
              <Skeleton height={12} width="30%" />
            </li>
          ))}
        </ul>
      </section>
    </SkeletonStatus>
  );
}

function CourseRow({ course, deleting, onDelete }) {
  const published = isPublished(course);
  return (
    <li className={styles.row}>
      <div>
        <h3 className={styles.courseName}>{course.name}</h3>
        {course.description && <p className={`${styles.meta} ${styles.clamp}`}>{course.description}</p>}
      </div>
      <span className={`${styles.status} ${published ? styles.statusPublished : styles.statusDraft}`}>
        {published ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}
        {course.status}
      </span>
      <div>
        <div>{course.mode || '—'}</div>
        <p className={styles.meta}>
          {course.moduleCount ?? 0} modules · {course.lessonCount ?? 0} lessons
        </p>
      </div>
      <div className={styles.actions}>
        <Link className={styles.iconBtn} to={`/company-courses/${course.courseId}/edit`} aria-label={`Edit ${course.name}`} title="Edit">
          <Pencil size={16} aria-hidden="true" />
        </Link>
        <Link className={styles.iconBtn} to="/courses" aria-label={`View ${course.name} on Learn`} title="View on Learn">
          <Eye size={16} aria-hidden="true" />
        </Link>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.danger}`}
          aria-label={`Delete ${course.name}`}
          title="Delete"
          disabled={deleting}
          onClick={() => onDelete(course)}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function CourseGroup({ title, courses, emptyText, deletingId, onDelete }) {
  return (
    <section className={styles.section} aria-label={`${title} courses`}>
      <h2 className={styles.groupHeading}>
        {title}
        <span className={styles.count} aria-label={`${courses.length} ${title.toLowerCase()} courses`}>{courses.length}</span>
      </h2>
      {courses.length === 0 ? (
        <p className={styles.groupEmpty}>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {courses.map((c) => (
            <CourseRow key={c.courseId} course={c} deleting={deletingId === c.courseId} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ProviderDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const state = useDataState(fetchOwnCourses, []);
  const [deletedIds, setDeletedIds] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const userId = user?.userId ?? user?.id ?? null;
  // The API already scopes to the signed-in provider; also drop any row that is explicitly owned by someone else.
  const courses = useMemo(
    () => (state.data || []).filter((c) => (
      !deletedIds.includes(c.courseId)
      && (c.createdBy == null || userId == null || String(c.createdBy) === String(userId))
    )),
    [state.data, deletedIds, userId],
  );

  const groups = useMemo(() => ({
    draft: courses.filter((c) => !isPublished(c)),
    published: courses.filter(isPublished),
  }), [courses]);

  const totals = useMemo(() => ({
    modules: courses.reduce((s, c) => s + (c.moduleCount ?? 0), 0),
    lessons: courses.reduce((s, c) => s + (c.lessonCount ?? 0), 0),
  }), [courses]);

  const statusItems = useMemo(() => [
    { label: 'Published', value: groups.published.length, sublabel: 'Visible to learners', color: 'var(--teal)' },
    { label: 'Draft', value: groups.draft.length, sublabel: 'Still in course studio', color: 'var(--coral)' },
  ], [groups]);

  const modeItems = useMemo(() => {
    const counts = courses.reduce((acc, c) => {
      const k = c.mode || 'Online';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([label, value]) => ({ label, value, sublabel: `${value} course${value === 1 ? '' : 's'}` }));
  }, [courses]);

  const handleDelete = async (course) => {
    if (deletingId) return;
    if (!confirm(`Delete "${course.name}"? This cannot be undone.`)) return;
    setDeletingId(course.courseId);
    try {
      await api.delete(`/company/courses/${course.courseId}`);
      showToast('Course deleted', 'success');
      setDeletedIds((prev) => [...prev, course.courseId]);
    } catch (err) {
      showToast(err.message || 'Failed to delete course', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  let body;
  if (state.status === 'loading' && state.data === undefined) {
    body = <DashboardSkeleton />;
  } else if (state.status === 'error' && state.data === undefined) {
    body = <ErrorState title="Provider dashboard unavailable" error={state.error} onRetry={state.reload} />;
  } else {
    body = (
      <>
        {state.status === 'error' && (
          <ErrorState title="Provider dashboard unavailable" error={state.error} onRetry={state.reload} />
        )}
        <Panel>
          <div className={styles.statGrid}>
            <StatCard value={courses.length} label="total courses" icon={BookOpenCheck} />
            <StatCard value={groups.published.length} label="published" icon={CheckCircle2} />
            <StatCard value={groups.draft.length} label="drafts" icon={Clock3} />
            <StatCard value={`${totals.modules} · ${totals.lessons}`} label="modules · lessons" icon={Layers} />
          </div>
          {courses.length === 0 && (
            <p className={styles.notice}>No courses yet — the studio is empty until you create your first course.</p>
          )}
        </Panel>

        {courses.length === 0 ? (
          <section className={styles.section}>
            <Panel>
              <EmptyState
                title="Start your course library"
                description="Create a course, add modules and lessons, then publish it when ready. Learners discover published courses on the Learn page."
                action={{ label: 'Create your first course', onClick: () => navigate('/company-courses/new') }}
              />
            </Panel>
          </section>
        ) : (
          <>
            <CourseGroup
              title="Draft"
              courses={groups.draft}
              emptyText="No draft courses."
              deletingId={deletingId}
              onDelete={handleDelete}
            />
            <CourseGroup
              title="Published"
              courses={groups.published}
              emptyText="No published courses yet."
              deletingId={deletingId}
              onDelete={handleDelete}
            />
          </>
        )}

        <section className={`${styles.section} ${styles.charts}`}>
          <Panel>
            <BarList title="Publication status" items={statusItems} />
          </Panel>
          <Panel>
            {modeItems.length === 0 ? (
              <div>
                <h3 className={styles.chartTitle}>Delivery mode</h3>
                <p className={styles.groupEmpty}>Create courses to see your mix of Online, Hybrid and On-site delivery.</p>
              </div>
            ) : (
              <BarList title="Delivery mode" items={modeItems} />
            )}
          </Panel>
        </section>
      </>
    );
  }

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Training provider workspace</p>
          <h1 className={styles.title}>Course provider</h1>
          <p className={styles.subtitle}>Your courses, grouped by whether learners can see them yet.</p>
        </div>
        <div className={styles.headingActions}>
          <Link className={styles.link} to="/company-courses">Manage courses</Link>
          <Button variant="primary" onClick={() => navigate('/company-courses/new')}>
            <Plus size={16} aria-hidden="true" /> Create course
          </Button>
        </div>
      </div>
      {body}
    </div>
  );
}
