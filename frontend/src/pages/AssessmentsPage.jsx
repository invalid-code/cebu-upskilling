import { useState, useEffect } from 'react';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Button from '../components/ui/Button';
import EmptyState from '../components/shared/EmptyState';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ArrowUpRight } from 'lucide-react';

const styles = {
  heading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 22,
    marginBottom: 28,
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
    fontSize: 'clamp(2rem, 4vw, 3.3rem)',
  },
  subtitle: {
    color: 'var(--muted)',
    margin: '8px 0 0',
    maxWidth: 450,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: 16,
  },
  col7: { gridColumn: 'span 7' },
  col5: { gridColumn: 'span 5' },
  recBadge: {
    display: 'inline-block',
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 999,
    marginBottom: 14,
  },
  recTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
  },
  recMeta: {
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 16,
  },
  recBanner: {
    background: 'var(--coral-soft)',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 13,
    color: 'var(--ink)',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  resultsH3: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 19,
    marginBottom: 16,
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
  },
  resultName: {
    fontSize: 14,
    fontWeight: 700,
  },
  resultDate: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 2,
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AssessmentsPage() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/assessments/recommended').catch(() => null),
      api.get('/assessments/results').catch(() => []),
    ])
      .then(([rec, res]) => {
        setRecommended(rec);
        setResults(res || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const targetRole = user?.targetRole?.trim();

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Proof that moves with you</div>
          <h1 style={styles.h1}>Assessments</h1>
          <p style={styles.subtitle}>
            Verified results strengthen your profile and your job match.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <Panel style={styles.col7}>
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : recommended ? (
            <div>
              <span style={styles.recBadge}>Recommended next</span>
              <h2 style={styles.recTitle}>{recommended.skillName}</h2>
              <p style={styles.recMeta}>
                30 questions · 45 minutes · Proctored · Builds toward {recommended.targetLevelLabel}
              </p>
              <div style={styles.recBanner}>
                Your current level is {recommended.currentLevel} {recommended.currentLevelLabel}.
                A verified result can move this skill into your job applications.
              </div>
              <Button variant="primary">
                Start assessment <ArrowUpRight size={14} />
              </Button>
            </div>
          ) : (
            <EmptyState
              title={targetRole ? 'All skills matched' : 'No recommended assessment'}
              description={targetRole
                ? 'You have no remaining skill gaps for your target role.'
                : 'Set a target role to see which assessment to take next.'}
            />
          )}
        </Panel>

        <Panel style={styles.col5}>
          <h3 style={styles.resultsH3}>Recent results</h3>
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : results.length === 0 ? (
            <EmptyState
              title="No results yet"
              description="Verified assessment results will appear here."
            />
          ) : (
            results.map((result, i) => (
              <div key={result.assessmentId} style={{
                ...styles.resultItem,
                borderBottom: i === results.length - 1 ? 'none' : '1px solid var(--line)',
              }}>
                <div>
                  <div style={styles.resultName}>{result.skillName}</div>
                  <div style={styles.resultDate}>Verified {formatDate(result.completedAt)}</div>
                </div>
                <Tag variant="good">{result.scoredLevel} {result.levelLabel}</Tag>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}
