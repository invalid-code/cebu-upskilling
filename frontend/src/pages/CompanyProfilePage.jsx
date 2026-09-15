import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import EmptyState from '../components/shared/EmptyState';
import CompanyAvatar from '../components/shared/CompanyAvatar';
import Skeleton, { SkeletonStatus, SkeletonText } from '../components/ui/Skeleton';
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
  coverBanner: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    objectFit: 'cover',
    display: 'block',
    marginBottom: 18,
    border: '1px solid var(--line)',
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
          <SkeletonStatus label="Loading company profile...">
            <Panel style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <Skeleton height={76} width={76} radius="50%" />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <Skeleton height={28} width="45%" radius={8} style={{ marginBottom: 10 }} />
                  <Skeleton height={13} width="60%" style={{ marginBottom: 12 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Skeleton height={24} width={82} radius={12} />
                    <Skeleton height={24} width={110} radius={12} />
                    <Skeleton height={24} width={70} radius={12} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <SkeletonText lines={3} lineHeight={13} gap={9} lastWidth="65%" />
              </div>
            </Panel>
            <Panel>
              <Skeleton height={16} width={130} style={{ marginBottom: 14 }} />
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                    <Skeleton height={40} width={40} radius={12} />
                    <div style={{ flex: 1 }}>
                      <Skeleton height={14} width="40%" style={{ marginBottom: 8 }} />
                      <Skeleton height={12} width="30%" />
                    </div>
                  </div>
                  <Skeleton height={14} width={110} />
                </div>
              ))}
            </Panel>
          </SkeletonStatus>
        ) : error || !company ? (
          <Panel>
            <EmptyState title="Company unavailable" description={error || 'This company could not be found.'} />
          </Panel>
        ) : (
          <>
            <Panel>
              {company.coverImageUrl && (
                <img src={company.coverImageUrl} alt={`${company.name} cover`} style={styles.coverBanner} />
              )}
              <div style={styles.hero}>
                <CompanyAvatar name={company.name} src={company.logoUrl} size={76} />
                <div>
                  <h1 style={styles.h1}>{company.name}</h1>
                  {company.tagline && (
                    <p style={{ ...styles.metaLine, fontStyle: 'italic', color: 'var(--coral)', fontWeight: 600 }}>{company.tagline}</p>
                  )}
                  {metaParts.length > 0 && (
                    <p style={styles.metaLine}>{metaParts.join(' · ')}</p>
                  )}
                  <div style={styles.chips}>
                    {company.industry && <Tag>{company.industry}</Tag>}
                    {company.companySize && <Tag variant="sand">{company.companySize} employees</Tag>}
                    {company.location && <Tag variant="sand">{company.location}</Tag>}
                  </div>
                  {company.profileCompleteness != null && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, maxWidth: 180, height: 6, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${company.profileCompleteness}%`, height: '100%', background: company.profileCompleteness === 100 ? 'var(--teal)' : 'var(--coral)' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{company.profileCompleteness}% complete</span>
                    </div>
                  )}
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
              {(company.linkedInUrl || company.facebookUrl) && (
                <p style={{ ...styles.metaLine, marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {company.linkedInUrl && (
                    <a href={company.linkedInUrl} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--teal)', fontWeight: 700 }}>
                      LinkedIn
                    </a>
                  )}
                  {company.facebookUrl && (
                    <a href={company.facebookUrl} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--teal)', fontWeight: 700 }}>
                      Facebook
                    </a>
                  )}
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