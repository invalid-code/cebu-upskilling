import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import EmptyState from '../components/shared/EmptyState';
import CompanyAvatar from '../components/shared/CompanyAvatar';
import { api } from '../api/client';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
  },
  topbar: {
    background: 'var(--teal)',
    color: 'rgba(245, 250, 248, 0.96)',
    padding: '14px clamp(20px, 4vw, 56px)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    background: 'var(--coral)',
    display: 'grid',
    placeItems: 'center',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 15,
  },
  brandName: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    marginRight: 'auto',
  },
  topLink: {
    color: 'rgba(225, 240, 235, 0.92)',
    fontSize: 13,
    textDecoration: 'none',
    fontWeight: 700,
  },
  content: {
    maxWidth: 980,
    margin: '0 auto',
    padding: '34px clamp(20px, 4vw, 56px) 80px',
  },
  hero: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  h1: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
    margin: '0 0 6px',
  },
  metaLine: {
    color: 'var(--muted)',
    fontSize: 14,
    margin: 0,
  },
  chips: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  sectionTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 17,
    margin: '0 0 12px',
  },
  body: {
    fontSize: 14,
    lineHeight: 1.7,
    color: 'var(--ink)',
    whiteSpace: 'pre-line',
    margin: 0,
  },
  jobList: {
    display: 'grid',
    gap: 14,
  },
  jobCard: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
    flexWrap: 'wrap',
    textDecoration: 'none',
    color: 'inherit',
    border: '1px solid var(--line)',
    borderRadius: 14,
    padding: '14px 18px',
    background: 'var(--surface)',
    transition: 'border-color 0.15s',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: 700,
    margin: '0 0 4px',
  },
  jobMeta: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: 0,
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
};

function formatSalary(salaryRange) {
  return salaryRange || 'Salary on application';
}

export default function CompanyProfilePage() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/companies/${companyId}`),
      api.get(`/companies/${companyId}/posts`),
    ])
      .then(([companyData, postsData]) => {
        setCompany(companyData);
        setPosts(postsData?.items || []);
      })
      .catch((err) => setError(err.message || 'Could not load company profile'))
      .finally(() => setLoading(false));
  }, [companyId]);

  const metaParts = [
    company?.industry,
    company?.companySize ? `${company.companySize} employees` : '',
    company?.location,
  ].filter(Boolean);

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div style={styles.brandMark}>CU</div>
        <strong style={styles.brandName}>Cebu Upskilling</strong>
        <Link to="/jobs" style={styles.topLink}>Browse jobs</Link>
      </header>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>Loading company profile...</div>
        ) : error || !company ? (
          <Panel>
            <EmptyState title="Company unavailable" description={error || 'This company could not be found.'} />
          </Panel>
        ) : (
          <>
            <Panel>
              <div style={styles.hero}>
                <CompanyAvatar name={company.name} src={company.logoUrl} size={76} />
                <div>
                  <h1 style={styles.h1}>{company.name}</h1>
                  {metaParts.length > 0 && (
                    <p style={styles.metaLine}>{metaParts.join(' · ')}</p>
                  )}
                  <div style={styles.chips}>
                    {company.industry && <Tag>{company.industry}</Tag>}
                    {company.companySize && <Tag variant="sand">{company.companySize} employees</Tag>}
                    {company.location && <Tag variant="sand">{company.location}</Tag>}
                  </div>
                </div>
              </div>
              {company.website && (
                <p style={{ ...styles.metaLine, marginTop: 16 }}>
                  Website:{' '}
                  <a href={company.website} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--teal)', fontWeight: 700 }}>
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </p>
              )}
              {company.description && (
                <p style={{ ...styles.body, marginTop: 16 }}>{company.description}</p>
              )}
            </Panel>

            <h2 style={styles.sectionTitle}>
              Open roles {posts.length > 0 && `(${posts.length})`}
            </h2>
            {posts.length === 0 ? (
              <Panel>
                <EmptyState
                  title="No open roles right now"
                  description={`${company.name} has no active postings at the moment. Check back soon.`}
                />
              </Panel>
            ) : (
              <div style={styles.jobList}>
                {posts.map((post) => (
                  <Link
                    key={post.postId}
                    to={`/jobs/${post.postId}`}
                    style={styles.jobCard}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <CompanyAvatar name={post.companyName} src={post.companyLogoUrl} size={40} />
                      <div>
                        <h3 style={styles.jobTitle}>{post.title}</h3>
                        <p style={styles.jobMeta}>
                          {[post.jobType, post.location].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <strong>{formatSalary(post.salaryRange)}</strong>
                  </Link>
                ))}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}