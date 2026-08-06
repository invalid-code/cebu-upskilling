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
    maxWidth: 450,
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
  empty: {
    padding: 45,
    textAlign: 'center',
    border: '1px dashed var(--line)',
    borderRadius: 15,
    background: 'var(--surface)',
    color: 'var(--muted)',
    fontSize: 13,
  },
};

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [level, setLevel] = useState('');

  useEffect(() => {
    api.get('/courses')
      .then((data) => {
        setCourses((data || []).map((c) => ({
          courseId: c.courseId,
          name: c.name,
          provider: c.genre?.name || 'Provider',
          technicalLevel: c.technicalLevel,
          duration: c.technicalLevel ? `${c.technicalLevel} hours` : undefined,
          description: c.description,
        })));
      })
      .catch((err) => setError(err.message || 'Could not load courses'))
      .finally(() => setLoading(false));
  }, []);

  const providers = [...new Set(courses.map((c) => c.provider))];

  const filteredCourses = courses.filter((course) => {
    if (search && !course.name.toLowerCase().includes(search.toLowerCase()) &&
        !course.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (provider && course.provider !== provider) return false;
    if (level === 'beginner' && course.technicalLevel > 10) return false;
    if (level === 'intermediate' && (course.technicalLevel <= 10 || course.technicalLevel > 20)) return false;
    if (level === 'advanced' && course.technicalLevel <= 20) return false;
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
        <select className="field" style={styles.field} value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">All providers</option>
          {providers.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select className="field" style={styles.field} value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Any level</option>
          <option value="beginner">Beginner (≤10 hrs)</option>
          <option value="intermediate">Intermediate (11–20 hrs)</option>
          <option value="advanced">Advanced (&gt;20 hrs)</option>
        </select>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading courses...</div>
      ) : (
        <div style={styles.grid}>
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.courseId}
              course={course}
              tagVariant="default"
              tagLabel="Skill builder"
            />
          ))}
        </div>
      )}

      {!loading && filteredCourses.length === 0 && (
        <div style={styles.empty}>
          {error
            ? `Couldn't load courses. Check back later.`
            : (courses.length > 0 ? 'No courses match your search.' : 'No courses available yet.')}
        </div>
      )}
    </div>
  );
}
