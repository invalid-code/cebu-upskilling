import { useNavigate } from 'react-router-dom';
import JobPostForm from '../components/jobs/JobPostForm';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import styles from './JobFormPage.module.css';

export default function PostJobPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (payload) => {
    const created = await api.post('/posts', payload);
    showToast(`Job posted — "${payload.title || created?.title || 'New role'}" is now live`, 'success');
    return created;
  };

  const handleSaved = (created) => {
    navigate(created?.postId ? `/edit-job/${created.postId}` : '/business-dashboard');
  };

  return (
    <div className="view-enter">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Hire the right fit</p>
        <h1 className={styles.title}>Post a job</h1>
      </div>
      <JobPostForm onSubmit={handleSubmit} onSaved={handleSaved} submitLabel="Post job" />
    </div>
  );
}
