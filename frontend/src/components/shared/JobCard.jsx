import { Link, useNavigate } from 'react-router-dom';
import Tag from '../ui/Tag';
import Button from '../ui/Button';
import CompanyAvatar from './CompanyAvatar';

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
  titleRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    margin: '12px 0 5px',
  },
  company: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: '0 0 8px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  companyLink: {
    color: 'var(--teal)',
    fontWeight: 700,
    textDecoration: 'underline',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 12,
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
  const navigate = useNavigate();
  const remoteTag = job.isRemote ? (
    <Tag variant="good">Remote</Tag>
  ) : (
    <Tag variant="sand">On-site</Tag>
  );

  const openCompany = (e) => {
    if (!job.companyId) return;
    e.preventDefault();
    e.stopPropagation();
    navigate(`/companies/${job.companyId}`);
  };

  return (
    <Link to={`/jobs/${job.id}`} className="job" style={styles.card} data-kind={job.kind}>
      <div style={styles.topRow}>
        <Tag variant={job.kind === 'sme' ? 'sand' : 'default'}>
          {job.kindLabel || job.jobType || 'Job'}
        </Tag>
        {remoteTag}
      </div>
      <div style={{ ...styles.titleRow }}>
        {(job.companyLogoUrl || job.company) && (
          <div style={{ marginTop: 12 }}>
            <CompanyAvatar name={job.company} src={job.companyLogoUrl} size={38} />
          </div>
        )}
        <h4 style={styles.title}>{job.title}</h4>
      </div>
      <p style={styles.company}>
        {job.companyId ? (
          <button type="button" style={styles.companyLink} onClick={openCompany}>
            {job.company}
          </button>
        ) : (
          job.company
        )}
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
