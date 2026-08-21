import Tag from '../ui/Tag';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useApplications } from '../../context/ApplicationsContext';

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
  company: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: '0 0 8px',
  },
  salary: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
  },
  match: {
    marginTop: 5,
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

export default function JobCard({ job }) {
  const { showToast } = useToast();
  const { applyToJob, isApplied } = useApplications();

  const applied = isApplied(job.id);

  const handleApply = () => {
    if (applied) return;
    applyToJob(job);
    showToast('Application saved to your tracker');
  };

  return (
    <article className="job" style={styles.card} data-kind={job.kind}>
      <Tag variant={job.kind === 'sme' ? 'sand' : 'default'}>
        {job.kindLabel || 'Job'}
      </Tag>
      <h4 style={styles.title}>{job.title}</h4>
      <p style={styles.company}>{job.company} · {job.location}</p>
      <div>
        <strong style={styles.salary}>{job.salary}</strong>
        <p style={styles.match}>
          Match: <b style={{ color: 'var(--coral)' }}>{job.match}</b>
        </p>
      </div>
      <div className="meta" style={styles.meta}>
        {job.schedule && (
          <Tag variant="sand">{job.schedule}</Tag>
        )}
        {job.requiredSkillLevels?.length > 0
          ? job.requiredSkillLevels.map((skill) => (
              <span key={skill.name} style={styles.metaText}>
                {skill.name} · L{skill.level}
              </span>
            ))
          : job.skills?.map((skill) => (
              <span key={skill} style={styles.metaText}>{skill}</span>
            ))}
        <Button
          variant={applied ? 'primary' : 'secondary'}
          style={{ marginLeft: 'auto', padding: '5px 8px', minHeight: 28 }}
          onClick={handleApply}
        >
          {applied ? 'Applied' : 'Apply'}
        </Button>
      </div>
    </article>
  );
}
