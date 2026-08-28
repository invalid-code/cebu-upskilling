import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import JobPostForm from '../components/jobs/JobPostForm';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';

const styles = {
  heading: {
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 700,
    color: 'var(--coral)',
    marginBottom: 12,
  },
  h1: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
    margin: 0,
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
};

export default function EditJobPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/posts/${postId}`)
      .then(setInitial)
      .catch((err) => setError(err?.message || 'Could not load this job posting'))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/posts/${postId}`, payload);
      showToast('Job posting updated successfully', 'success');
      navigate('/business-dashboard');
    } catch (err) {
      const msg = err?.message || 'Could not update the job posting';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading job posting...</div>;
  if (error || !initial) {
    return (
      <Panel>
        <EmptyState title="Job posting unavailable" description={error || 'This posting could not be found.'} />
      </Panel>
    );
  }

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div style={styles.eyebrow}>Hire the right fit</div>
        <h1 style={styles.h1}>Edit job posting</h1>
      </div>
      <Panel>
        <JobPostForm initial={initial} onSubmit={handleSubmit} submitting={submitting} error={error} submitLabel="Save changes" />
      </Panel>
    </div>
  );
}