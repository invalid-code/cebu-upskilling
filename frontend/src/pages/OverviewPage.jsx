import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import CourseCard from '../components/shared/CourseCard';
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
};

export default function OverviewPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses')
      .then((data) => {
        setCourses((data || []).map((c) => ({
          courseId: c.courseId,
          name: c.name,
          provider: c.genre?.name || 'Provider',
          duration: c.technicalLevel ? `${c.technicalLevel} hours` : undefined,
          description: c.description,
        })));
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
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
            Your match score and pathway will shape your next step.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/skills')}>
          Update skills
        </Button>
      </div>

      <div style={styles.grid}>
        <div style={styles.col8}>
          <div style={styles.hero}>
            <h2 style={styles.heroH2}>Build your profile to unlock your match score.</h2>
            <p style={styles.heroP}>
              Take a skill assessment or add your skills to see how close you are to your target role.
            </p>
            <Button variant="primary" onClick={() => navigate('/assessments')}>
              Start a skill assessment <ArrowUpRight size={14} />
            </Button>
          </div>

          <div style={{ ...styles.grid, marginTop: 16 }}>
            <Panel style={styles.col5}>
              <div style={styles.eyebrow}>Current match</div>
              <EmptyState
                title="No score yet"
                description="Complete a skill assessment to generate your match score."
              />
            </Panel>

            <Panel style={styles.col7}>
              <div style={{ ...styles.sectionTitle, margin: '0 0 12px' }}>
                <h3 style={styles.sectionH3}>Pathway rail</h3>
              </div>
              <EmptyState
                title="Your pathway will appear here"
                description="Set a target role and map your skills to build it."
              />
            </Panel>
          </div>
        </div>

        <div style={styles.col4}>
          <Panel>
            <div style={{ ...styles.sectionTitle, margin: '0 0 12px' }}>
              <h3 style={styles.sectionH3}>This week</h3>
            </div>
            <EmptyState
              title="No activity yet"
              description="Your learning time and applications will show up here."
            />
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
        <EmptyState
          title="No skill gaps loaded"
          description="Add skills to compare your profile against a target role."
        />
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
