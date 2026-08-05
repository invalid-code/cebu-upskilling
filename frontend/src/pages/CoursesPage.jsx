import { useState, useEffect } from 'react';
import CourseCard from '../components/shared/CourseCard';
import { api } from '../api/client';

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
  toolbar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  field: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    minHeight: 42,
    padding: '9px 12px',
    color: 'var(--ink)',
    fontSize: 14,
  },
  grid: {
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

const fallbackCourses = [
  { name: 'Modern JavaScript for Frontend Work', provider: 'CodeChum Learning', mode: 'Online', duration: '18 hours', price: 'Free', description: 'Closes your largest current gap for Frontend Developer.' },
  { name: 'TypeScript from Zero to Confident', provider: 'DevCon Cebu Academy', mode: 'Hybrid', duration: '12 hours', price: '₱1,200', description: 'Start at Beginner and build toward Intermediate.' },
  { name: 'Frontend Portfolio Sprint', provider: 'Serbisyo Digital', mode: 'Online', duration: '6 hours', price: 'Free', description: 'Ship one portfolio project with a Cebu mentor.' },
  { name: 'React Testing Fundamentals', provider: 'TESDA Partner Lab', mode: 'In-person', duration: '20 hours', price: '₱2,500', description: 'Practice unit, component, and end-to-end testing.' },
];

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    api.get('/courses')
      .then((data) => {
        if (data && data.length > 0) {
          setCourses(data.map((c) => ({
            name: c.name,
            provider: c.genre?.name || 'Provider',
            mode: 'Online',
            duration: `${c.technicalLevel || 10} hours`,
            price: 'Free',
            description: c.description,
          })));
        } else {
          setCourses(fallbackCourses);
        }
      })
      .catch(() => setCourses(fallbackCourses))
      .finally(() => setLoading(false));
  }, []);

  const filteredCourses = courses.filter((course) => {
    if (search && !course.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (mode && course.mode !== mode) return false;
    if (price === 'free' && course.price !== 'Free') return false;
    if (price === 'paid' && course.price === 'Free') return false;
    return true;
  });

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Learn with purpose</div>
          <h1 style={styles.h1}>Courses for the gap you have.</h1>
          <p style={styles.subtitle}>
            Every recommendation is tied to a skill and a target role.
          </p>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input
          className="field"
          style={{ ...styles.field, minWidth: 230 }}
          placeholder="Search courses or skills"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field" style={styles.field} value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">All delivery modes</option>
          <option>Online</option>
          <option>Hybrid</option>
          <option>In-person</option>
        </select>
        <select className="field" style={styles.field} value={price} onChange={(e) => setPrice(e.target.value)}>
          <option value="">Any price</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading courses...</div>
      ) : (
        <div style={styles.grid}>
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.name}
              course={course}
              tagVariant={course.price === 'Free' ? 'coral' : 'default'}
              tagLabel={course.price === 'Free' ? 'Best next step' : 'Skill builder'}
            />
          ))}
        </div>
      )}

      {!loading && filteredCourses.length === 0 && (
        <div style={{ padding: 45, textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 15, background: 'var(--surface)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No courses match your search.</p>
        </div>
      )}
    </div>
  );
}
