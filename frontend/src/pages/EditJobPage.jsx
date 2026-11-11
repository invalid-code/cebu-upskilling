import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import JobPostForm from '../components/jobs/JobPostForm';
import { useToast } from '../context/ToastContext';
import Skeleton, { SkeletonStatus } from '../components/ui/Skeleton';
import { api } from '../api/client';
import styles from './JobFormPage.module.css';

export default function EditJobPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/posts/${postId}`)
      .then(setInitial)
      .catch((err) => setError(err?.message || 'Could not load this job posting'))
      .finally(() => setLoading(false));
  }, [postId, attempt]);

  const handleSubmit = async (payload) => {
    await api.put(`/posts/${postId}`, payload);
    showToast('Job posting updated successfully', 'success');
  };

  if (loading) {
    return (
      <SkeletonStatus label="Loading job posting...">
        <Panel>
          <Skeleton height={24} width="35%" radius={8} style={{ marginBottom: 22 }} />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <Skeleton height={12} width={92} style={{ marginBottom: 7 }} />
              <Skeleton height={42} width="100%" radius={10} />
            </div>
          ))}
          <Skeleton height={44} width={160} radius={10} />
        </Panel>
      </SkeletonStatus>
    );
  }
  if (error) {
    return (
      <ErrorState
        title="Job posting unavailable"
        error={error}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  }
  if (!initial) {
    return (
      <Panel>
        <EmptyState title="Job posting unavailable" description="This posting could not be found." />
      </Panel>
    );
  }

  return (
    <div className="view-enter">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Hire the right fit</p>
        <h1 className={styles.title}>Edit job posting</h1>
      </div>
      <JobPostForm
        initial={initial}
        onSubmit={handleSubmit}
        onSaved={() => navigate('/business-dashboard')}
        submitLabel="Save changes"
      />
    </div>
  );
}
