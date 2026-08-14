import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';

import EmptyState from '../components/shared/EmptyState';
import StatCard from '../components/shared/StatCard';
import CourseCard from '../components/shared/CourseCard';
import SkillGapItem from '../components/shared/SkillGapItem';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../context/ApplicationsContext';
import { api } from '../api/client';
import { ArrowUpRight, Check, Clock, BookOpen, Send } from 'lucide-react';

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
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: 16,
  },
  col8: { gridColumn: 'span 8' },
  col7: { gridColumn: 'span 7' },
  col5: { gridColumn: 'span 5' },
  col4: { gridColumn: 'span 4' },
  col12: { gridColumn: '1 / -1' },
  hero: {
    background: 'var(--teal)',
    color: 'var(--surface)',
    borderRadius: 22,
    padding: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  heroH2: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
    maxWidth: 560,
    position: 'relative',
    zIndex: 1,
  },
  heroP: {
    color: 'rgba(225, 240, 235, 0.90)',
    maxWidth: 590,
    position: 'relative',
    zIndex: 1,
    margin: '11px 0 22px',
  },
  sectionTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '30px 0 15px',
  },
  sectionH3: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 19,
  },
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },
  loading: {
    textAlign: 'center',
    padding: 45,
    color: 'var(--muted)',
    fontSize: 13,
  },
  matchBody: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
  },
  matchRing: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  matchRingInner: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    background: 'var(--surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchPercent: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1,
  },
  matchText: {
    flex: 1,
  },
  matchStatus: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
  },
  matchDesc: {
    fontSize: 13,
    color: 'var(--muted)',
    margin: 0,
    lineHeight: 1.4,
  },
  matchFooter: {
    marginTop: 16,
    background: 'var(--coral-soft)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 12,
    color: 'var(--ink)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  matchRefresh: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--ink)',
    cursor: 'pointer',
  },
  pathwayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepsBadge: {
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 999,
  },
  stepper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  step: {
    display: 'flex',
    gap: 14,
    position: 'relative',
  },
  stepIndicator: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  stepLine: {
    width: 2,
    flexGrow: 1,
    minHeight: 16,
    margin: '4px 0',
  },
  stepContent: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: '30px',
  },
  stepDesc: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: '2px 0 0',
  },
};

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applications } = useApplications();
  const hasApplied = applications.length > 0;
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skillGaps, setSkillGaps] = useState([]);
  const [skillGapsLoading, setSkillGapsLoading] = useState(true);
  const [recommendedAssessment, setRecommendedAssessment] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState({ learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 });
  const [weeklyStatsLoading, setWeeklyStatsLoading] = useState(true);

  const targetRole = user?.targetRole?.trim();

  useEffect(() => {
    const controller = new AbortController();
    api.get('/courses', { signal: controller.signal })
      .then((data) => {
        setCourses((data || []).map((c) => ({
          courseId: c.courseId,
          name: c.name,
          provider: c.genre?.name || 'Provider',
          mode: c.mode || 'Online',
          duration: c.technicalLevel ? `${c.technicalLevel} hours` : undefined,
          description: c.description,
        })));
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!targetRole || !hasApplied) {
      setSkillGaps([]);
      setSkillGapsLoading(false);
      return;
    }
    const controller = new AbortController();
    api.get('/skillgaps', { signal: controller.signal })
      .then((data) => setSkillGaps(data || []))
      .catch(() => setSkillGaps([]))
      .finally(() => setSkillGapsLoading(false));
    return () => controller.abort();
  }, [targetRole, hasApplied]);

  useEffect(() => {
    if (!targetRole) return;
    const controller = new AbortController();
    api.get('/assessments/recommended', { signal: controller.signal })
      .then((data) => setRecommendedAssessment(data))
      .catch(() => setRecommendedAssessment(null));
    return () => controller.abort();
  }, [targetRole]);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/stats/week', { signal: controller.signal })
      .then((data) => setWeeklyStats(data))
      .catch(() => setWeeklyStats({ learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 }))
      .finally(() => setWeeklyStatsLoading(false));
    return () => controller.abort();
  }, []);

  const recommended = courses.slice(0, 3);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>{today} · Cebu City</div>
          <h1 style={styles.h1}>Your next move is clear.</h1>
          <p style={styles.subtitle}>
            You're building toward <strong>{targetRole || 'your target role'}</strong>. Keep closing the two gaps that matter most.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/skills')}>
          Update skills
        </Button>
      </div>

      <div style={styles.grid}>
        <div style={styles.col8}>
          <div style={styles.hero}>
            <h2 style={styles.heroH2}>
              You're {skillGaps.length > 0 ? (() => {
                const totalRequired = skillGaps.reduce((s, g) => s + g.requiredLevel, 0);
                const totalCurrent = skillGaps.reduce((s, g) => s + g.currentLevel, 0);
                return totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0;
              })() : 0}% of the way to your target role.
            </h2>
            <p style={styles.heroP}>
              {recommendedAssessment
                ? `Complete the ${recommendedAssessment.skillName} assessment next. It is the fastest route to a stronger match.`
                : 'Take a skill assessment to see how close you are to your target role.'}
            </p>
            <Button variant="primary" onClick={() => navigate('/assessments')}>
              Continue pathway <ArrowUpRight size={14} />
            </Button>
          </div>

          <div style={{ ...styles.grid, marginTop: 16 }}>
            <Panel style={styles.col5}>
              <div style={styles.eyebrow}>Current match</div>
              {skillGapsLoading ? (
                <div style={styles.loading}>Calculating...</div>
              ) : skillGaps.length === 0 ? (
                <EmptyState
                  title={hasApplied ? 'No score yet' : 'Apply for a job first'}
                  description={hasApplied
                    ? 'Set a target role and add skills to generate your match score.'
                    : 'Your match score and skill gaps unlock once you apply for a job.'}
                />
              ) : (() => {
                const totalRequired = skillGaps.reduce((s, g) => s + g.requiredLevel, 0);
                const totalCurrent = skillGaps.reduce((s, g) => s + g.currentLevel, 0);
                const score = totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0;
                const ringColor = score >= 80 ? 'var(--good)' : score >= 50 ? 'var(--teal)' : 'var(--coral)';
                const status = score >= 80 ? 'Qualified' : score >= 50 ? 'Almost there' : 'Getting started';
                const desc = score >= 80
                  ? 'Minor skill gaps. Ready to apply with targeted prep.'
                  : score >= 50
                    ? 'You\'re halfway there. Focus on your remaining gaps.'
                    : 'Build your core skills to improve your match.';
                return (
                  <>
                    <div style={styles.matchBody}>
                      <div style={{
                        ...styles.matchRing,
                        background: `conic-gradient(${ringColor} ${score * 3.6}deg, var(--line) ${score * 3.6}deg)`,
                      }}>
                        <div style={styles.matchRingInner}>
                          <span style={{ ...styles.matchPercent, color: ringColor }}>{score}%</span>
                        </div>
                      </div>
                      <div style={styles.matchText}>
                        <div style={{ ...styles.matchStatus, color: ringColor }}>{status}</div>
                        <p style={styles.matchDesc}>{desc}</p>
                      </div>
                    </div>
                    <div style={styles.matchFooter}>
                      Last calculated just now ·{' '}
                      <button style={styles.matchRefresh} onClick={() => {
                        setSkillGapsLoading(true);
                        api.get('/skillgaps')
                          .then((data) => setSkillGaps(data || []))
                          .catch(() => setSkillGaps([]))
                          .finally(() => setSkillGapsLoading(false));
                      }}>Refresh</button>
                    </div>
                  </>
                );
              })()}
            </Panel>

            <Panel style={styles.col7}>
              {(() => {
                const step1Done = !!targetRole;
                const step2Done = false;
                const completedCount = [step1Done, step2Done].filter(Boolean).length;
                const currentStep = Math.min(completedCount + 1, 5);
                const totalSteps = 5;

                const steps = [
                  {
                    title: 'Set your target role',
                    desc: targetRole ? `${targetRole} · Cebu / Remote` : 'Choose a role to get started',
                  },
                  {
                    title: 'Map your current skills',
                    desc: step2Done ? '8 skills assessed, 3 verified' : 'Add your skills to your profile',
                  },
                  {
                    title: 'Close the highest gaps',
                    desc: 'JavaScript and TypeScript are next',
                  },
                  {
                    title: 'Verify your progress',
                    desc: 'Take a proctored assessment',
                  },
                  {
                    title: 'Get matched',
                    desc: 'Discover opportunities that fit you',
                  },
                ];

                return (
                  <>
                    <div style={styles.pathwayHeader}>
                      <h3 style={styles.sectionH3}>Pathway rail</h3>
                      <span style={styles.stepsBadge}>{currentStep} of {totalSteps} steps</span>
                    </div>
                    <div style={styles.stepper}>
                      {steps.map((step, i) => {
                        const num = i + 1;
                        const isCompleted = num < currentStep;
                        const isCurrent = num === currentStep;
                        const isLast = i === steps.length - 1;

                        const circleBg = isCompleted
                          ? 'var(--teal)'
                          : isCurrent
                            ? 'var(--coral)'
                            : 'var(--surface2)';
                        const circleColor = isCompleted || isCurrent ? '#fff' : 'var(--muted)';

                        return (
                          <div key={i} style={styles.step}>
                            <div style={styles.stepIndicator}>
                              <div style={{ ...styles.stepCircle, background: circleBg, color: circleColor }}>
                                {isCompleted ? <Check size={16} strokeWidth={3} /> : num}
                              </div>
                              {!isLast && (
                                <div style={{
                                  ...styles.stepLine,
                                  background: isCompleted ? 'var(--teal)' : 'var(--line)',
                                }} />
                              )}
                            </div>
                            <div style={{ ...styles.stepContent, paddingBottom: isLast ? 0 : undefined }}>
                              <div style={{
                                ...styles.stepTitle,
                                color: isCompleted || isCurrent ? 'var(--ink)' : 'var(--muted)',
                              }}>
                                {step.title}
                              </div>
                              <p style={styles.stepDesc}>{step.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </Panel>
          </div>
        </div>

        <div style={styles.col4}>
          <Panel>
            <div style={{ ...styles.sectionTitle, margin: '0 0 12px' }}>
              <h3 style={styles.sectionH3}>This week</h3>
            </div>
            {weeklyStatsLoading ? (
              <div style={styles.loading}>Loading stats...</div>
            ) : (
              <>
                <StatCard
                  value={`${weeklyStats.learningTimeHours}h`}
                  label="learning time"
                  icon={Clock}
                />
                <StatCard
                  value={weeklyStats.coursesActive}
                  label="courses active"
                  icon={BookOpen}
                />
                <StatCard
                  value={weeklyStats.jobsWorthApplying}
                  label="jobs worth applying"
                  icon={Send}
                />
              </>
            )}
          </Panel>

          <Panel style={{ marginTop: 16 }}>
            <div style={styles.eyebrow}>Quick action</div>
            <h3 style={{ fontSize: 18, marginBottom: 7 }}>Need a smaller first step?</h3>
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>
              Browse short courses that target only one gap at a time.
            </p>
            <Button variant="secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate('/courses')}>
              Browse courses
            </Button>
          </Panel>
        </div>
      </div>

      <div style={styles.sectionTitle}>
        <h3 style={styles.sectionH3}>Your skill gaps</h3>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/skills'); }}>View full profile →</a>
      </div>
      <Panel>
        {skillGapsLoading ? (
          <div style={styles.loading}>Loading skill gaps...</div>
        ) : skillGaps.length === 0 ? (
          <EmptyState
            title={!hasApplied
              ? 'Apply for a job to see your gaps'
              : targetRole ? 'No skill gaps yet' : 'Set a target role to see your gaps'}
            description={!hasApplied
              ? 'Skill gaps appear once you apply for a role.'
              : targetRole
                ? 'Your profile is complete for this role.'
                : 'Choose a target role to compare your skills against.'}
          />
        ) : (
          skillGaps.map((gap) => (
            <SkillGapItem
              key={gap.skillId}
              name={gap.skillName}
              subtitle={`Required ${gap.requiredLevel} · Current ${gap.currentLevel}`}
              percent={gap.requiredLevel > 0 ? Math.round((gap.currentLevel / gap.requiredLevel) * 100) : 0}
              gapLabel={gap.gap === 0 ? 'Ready' : `Gap ${gap.gap}`}
              verified={gap.verified}
            />
          ))
        )}
      </Panel>

      <div style={styles.sectionTitle}>
        <h3 style={styles.sectionH3}>Recommended for your path</h3>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/courses'); }}>See all courses →</a>
      </div>
      {loading ? (
        <div style={styles.loading}>Loading courses...</div>
      ) : recommended.length === 0 ? (
        <Panel>
          <EmptyState
            title="No courses available yet"
            description="Recommended courses will appear here once you add your skills and target role."
          />
        </Panel>
      ) : (
        <div style={styles.courseGrid}>
          {recommended.map((course) => (
            <CourseCard key={course.name} course={course} tagLabel="Skill builder" />
          ))}
        </div>
      )}
    </div>
  );
}
