import { Link } from 'react-router-dom';
import Tag from '../ui/Tag';
import Button from '../ui/Button';

const styles = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 15,
    padding: 17,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 220,
    textDecoration: 'none',
    color: 'inherit',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
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

function formatSalary(salaryRange) {
  return salaryRange || 'Salary on application';
}

export default function JobCard({ job }) {
  const remoteTag = job.isRemote ? (
    <Tag variant="good">Remote</Tag>
  ) : (
    <Tag variant="sand">On-site</Tag>
  );

  return (
    <Link to={`/jobs/${job.id}`} className="job" style={styles.card} data-kind={job.kind}>
      <div style={styles.topRow}>
        <Tag variant={job.kind === 'sme' ? 'sand' : 'default'}>
          {job.kindLabel || job.jobType || 'Job'}
        </Tag>
        {remoteTag}
      </div>
      <h4 style={styles.title}>{job.title}</h4>
      <p style={styles.company}>
        {job.company}
        {job.location ? ` · ${job.location}` : ''}
      </p>
      <div>
        <strong style={styles.salary}>{formatSalary(job.salaryRange)}</strong>
        {job.experienceLevel && (
          <p style={styles.metaText}>{job.experienceLevel} experience</p>
        )}
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
        <Button variant="secondary" style={{ marginLeft: 'auto', padding: '5px 8px', minHeight: 28 }}>
          View & apply
        </Button>
      </div>
    </Link>
  );
}