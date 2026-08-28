import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Panel from '../components/ui/Panel';
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
};

export default function PostJobPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError('');
    try {
      const created = await api.post('/posts', payload);
      showToast(`Job posted — "${payload.title || created?.title || 'New role'}" is now live`, 'success');
      navigate(created?.postId ? `/edit-job/${created.postId}` : '/business-dashboard');
    } catch (err) {
      const msg = err?.message || 'Could not save the job posting';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div style={styles.eyebrow}>Hire the right fit</div>
        <h1 style={styles.h1}>Post a job</h1>
      </div>
      <Panel>
        <JobPostForm onSubmit={handleSubmit} submitting={submitting} error={error} submitLabel="Post job" />
      </Panel>
    </div>
  );
}