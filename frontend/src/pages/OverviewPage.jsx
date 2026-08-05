import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import Tag from '../components/ui/Tag';
import Gauge from '../components/ui/Gauge';
import StatCard from '../components/shared/StatCard';
import SkillGapItem from '../components/shared/SkillGapItem';
import PathwayStep from '../components/shared/PathwayStep';
import CourseCard from '../components/shared/CourseCard';
import { Clock, BookOpen, Send, ArrowUpRight } from 'lucide-react';

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
    maxWidth: 62,
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
  gaugeWrap: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
  },
  scoreTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    display: 'block',
    marginBottom: 4,
  },
  scoreDesc: {
    margin: 0,
    color: 'var(--muted)',
    fontSize: 13,
  },
  notice: {
    padding: '12px 14px',
    borderRadius: 10,
    background: 'var(--coral-soft)',
    color: 'rgb(100, 75, 50)',
    fontSize: 12,
    marginTop: 15,
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
  path: {
    display: 'grid',
    gap: 0,
    marginTop: 8,
  },
};

const mockCourses = [
  { name: 'Modern JavaScript for Frontend Work', provider: 'CodeChum Learning', mode: 'Online', duration: '18 hours', price: 'Free' },
  { name: 'TypeScript from Zero to Confident', provider: 'DevCon Cebu Academy', mode: 'Hybrid', duration: '12 hours', price: '₱1,200' },
  { name: 'Frontend Portfolio Sprint', provider: 'Serbisyo Digital', mode: 'Online', duration: '6 hours', price: 'Free' },
];

const skillGaps = [
  { name: 'JavaScript', subtitle: 'Required: 4 · Your level: 3 Intermediate', percent: 75, gapLabel: 'Gap 1' },
  { name: 'TypeScript', subtitle: 'Required: 3 · Your level: 1 No Knowledge', percent: 20, gapLabel: 'Gap 2' },
  { name: 'React', subtitle: 'Required: 4 · Your level: 4 Advanced', percent: 100, gapLabel: 'Ready' },
];

export default function OverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Friday, July 17 · Cebu City</div>
          <h1 style={styles.h1}>Your next move is clear.</h1>
          <p style={styles.subtitle}>
            You're building toward <strong>Frontend Developer</strong>. Keep closing the two gaps that matter most.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/skills')}>
          Update skills
        </Button>
      </div>

      <div style={styles.grid}>
        <div style={styles.col8}>
          <div style={styles.hero}>
            <h2 style={styles.heroH2}>You're 78% of the way to your target role.</h2>
            <p style={styles.heroP}>
              Complete the JavaScript assessment next. It is the fastest route to a stronger match.
            </p>
            <Button variant="primary" onClick={() => navigate('/assessments')}>
              Continue pathway <ArrowUpRight size={14} />
            </Button>
          </div>

          <div style={{ ...styles.grid, marginTop: 16 }}>
            <Panel style={styles.col5}>
              <div style={styles.eyebrow}>Current match</div>
              <div style={styles.gaugeWrap}>
                <Gauge percent={78} />
                <div>
                  <b style={styles.scoreTitle}>Qualified</b>
                  <p style={styles.scoreDesc}>Minor skill gaps. Ready to apply with targeted prep.</p>
                </div>
              </div>
              <div style={styles.notice}>
                Last calculated 12 minutes ago · <a href="#" onClick={(e) => { e.preventDefault(); }}>Refresh</a>
              </div>
            </Panel>

            <Panel style={styles.col7}>
              <div style={{ ...styles.sectionTitle, margin: '0 0 15px' }}>
                <h3 style={styles.sectionH3}>Pathway rail</h3>
                <Tag>3 of 5 steps</Tag>
              </div>
              <div style={styles.path}>
                <PathwayStep step={1} title="Set your target role" description="Frontend Developer · Cebu / Remote" completed />
                <PathwayStep step={2} title="Map your current skills" description="8 skills assessed, 3 verified" completed />
                <PathwayStep step={3} title="Close the highest gaps" description="JavaScript and TypeScript are next" current />
                <PathwayStep step={4} title="Verify your progress" description="Take a proctored assessment" />
              </div>
            </Panel>
          </div>
        </div>

        <div style={styles.col4}>
          <Panel>
            <div style={{ ...styles.sectionTitle, margin: '0 0 12px' }}>
              <h3 style={styles.sectionH3}>This week</h3>
              <Tag variant="good">On track</Tag>
            </div>
            <StatCard value="4.5h" label="learning time" icon={Clock} />
            <StatCard value="2" label="courses active" icon={BookOpen} />
            <StatCard value="3" label="jobs worth applying" icon={Send} />
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
        {skillGaps.map((gap) => (
          <SkillGapItem key={gap.name} {...gap} />
        ))}
      </Panel>

      <div style={styles.sectionTitle}>
        <h3 style={styles.sectionH3}>Recommended for your path</h3>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/courses'); }}>See all courses →</a>
      </div>
      <div style={styles.courseGrid}>
        {mockCourses.map((course) => (
          <CourseCard key={course.name} course={course} tagVariant={course.price === 'Free' ? 'coral' : 'default'} tagLabel={course.price === 'Free' ? 'Best next step' : 'Skill builder'} />
        ))}
      </div>
    </div>
  );
}
