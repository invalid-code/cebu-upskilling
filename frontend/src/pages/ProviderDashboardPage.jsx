import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Layers, GraduationCap, CheckCircle2,
  Plus, ArrowRight, Eye, Pencil, Trash2, Sparkles,
  BookOpenCheck, Clock3, Library,
} from 'lucide-react';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import EmptyState from '../components/shared/EmptyState';
import StatCard from '../components/shared/StatCard';
import BarList from '../components/shared/BarList';
import { ErrorCard } from '../components/ui/ErrorState';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const styles = {
  heading: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 18, marginBottom: 28 },
  eyebrow: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--coral)', marginBottom: 12 },
  h1: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(2rem, 4vw, 3.3rem)', lineHeight: 0.95 },
  subtitle: { color: 'var(--muted)', margin: '10px 0 0', fontSize: 13, maxWidth: 560, lineHeight: 1.5 },
  date: { fontSize: 13, color: 'var(--muted)', margin: 0, whiteSpace: 'nowrap' },
  heroGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(280px, 0.85fr)', gap: 18 },
  hero: { background: 'var(--teal)', color: 'var(--surface)', borderRadius: 22, padding: 30, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 228 },
  heroH2: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', lineHeight: 1.05, position: 'relative', zIndex: 1 },
  heroP: { color: 'rgba(225, 240, 235, 0.88)', position: 'relative', zIndex: 1, margin: '12px 0 22px', fontSize: 13, lineHeight: 1.5, maxWidth: 520 },
  heroActions: { display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 1 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18 },
  section: { marginTop: 28 },
  sectionTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 14px' },
  sectionTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, margin: 0 },
  sectionHint: { fontSize: 12, color: 'var(--muted)', margin: 0 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 720 },
  th: { textAlign: 'left', color: 'var(--muted)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px 10px 0', whiteSpace: 'nowrap' },
  td: { borderTop: '1px solid var(--line)', padding: '16px 12px 16px 0', fontSize: 13, verticalAlign: 'top' },
  title: { fontWeight: 700, fontSize: 14, lineHeight: 1.2 },
  muted: { color: 'var(--muted)', fontSize: 12, lineHeight: 1.4 },
  pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', padding: '4px 9px', borderRadius: 999, border: '1px solid var(--line)' },
  actions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  iconBtn: { display: 'inline-grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer' },
  charts: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 },
  loading: { textAlign: 'center', padding: 45, color: 'var(--muted)', fontSize: 13 },
  nextSteps: { display: 'grid', gap: 10 },
  nextStep: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 14px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface2)' },
};

function formatDate(d = new Date()) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(d);
}

export default function ProviderDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get('/company/courses')
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch((err) => {
        const msg = err.message || 'Unable to load your courses.';
        // 403 for CourseProvider until backend widens Roles — show friendly empty state, not a hard error
        if (err.status === 403 || err.status === 401) {
          setCourses([]);
          setError(null);
          return;
        }
        setError(msg);
        showToast(msg, 'error');
      })
      .finally(() => setLoading(false));
  }, [retryKey, showToast]);

  const stats = useMemo(() => {
    const total = courses.length;
    const published = courses.filter((c) => String(c.status).toLowerCase() === 'published').length;
    const draft = total - published;
    const totalModules = courses.reduce((s, c) => s + (c.moduleCount ?? 0), 0);
    const totalLessons = courses.reduce((s, c) => s + (c.lessonCount ?? 0), 0);
    return { total, published, draft, totalModules, totalLessons };
  }, [courses]);

  const statusItems = useMemo(() => [
    { label: 'Published', value: stats.published, sublabel: 'Visible to learners', color: 'var(--teal)' },
    { label: 'Draft', value: stats.draft, sublabel: 'Still in course studio', color: 'var(--coral)' },
  ], [stats]);

  const modeItems = useMemo(() => {
    const counts = courses.reduce((acc, c) => {
      const k = c.mode || 'Online';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([label, value]) => ({ label, value, sublabel: `${value} course${value === 1 ? '' : 's'}` }));
  }, [courses]);

  const handleDelete = async (course) => {
    if (deletingId) return;
    if (!confirm(`Delete "${course.name}"? This cannot be undone.`)) return;
    setDeletingId(course.courseId);
    try {
      await api.delete(`/company/courses/${course.courseId}`);
      showToast('Course deleted', 'success');
      setCourses((prev) => prev.filter((c) => c.courseId !== course.courseId));
    } catch (err) {
      showToast(err.message || 'Failed to delete course', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div style={styles.loading}>Loading provider workspace…</div>;
  if (error) return <div style={{ padding: 20 }}><ErrorCard title="Provider dashboard unavailable" description={error} onRetry={() => setRetryKey((k) => k + 1)} /></div>;

  const displayName = user?.firstName ? `${user.firstName}${user?.lastName ? ` ${user.lastName}` : ''}` : 'Provider';

  return (
    <div className="view-enter">
      {/* Header */}
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Training provider workspace</div>
          <h1 style={styles.h1}>Course provider</h1>
          <p style={styles.subtitle}>
            Build and publish practical learning paths for Cebu&apos;s talent — the same studio that powers employer courses, focused only on curriculum.
          </p>
        </div>
        <p style={styles.date}>{formatDate()}</p>
      </div>

      {/* Hero + quick actions */}
      <div style={styles.heroGrid}>
        <div style={styles.hero}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.78)', marginBottom: 12 }}>
              <Sparkles size={14} /> Provider studio
            </div>
            <h2 style={styles.heroH2}>Welcome back, {displayName}.</h2>
            <p style={styles.heroP}>
              {stats.total === 0
                ? 'Create your first course to start reaching learners. Add modules, lessons, then publish when ready — no hiring tools, just curriculum.'
                : `You have ${stats.total} course${stats.total === 1 ? '' : 's'} · ${stats.published} published · ${stats.totalLessons} lessons live for learners.`}
            </p>
          </div>
          <div style={styles.heroActions}>
            <Button variant="primary" onClick={() => navigate('/company-courses/new')} style={{ background: 'var(--surface)', color: 'var(--teal)', borderColor: 'transparent' }}>
              <Plus size={16} /> Create course
            </Button>
            <Link to="/company-courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--surface)', fontWeight: 700, fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.28)', padding: '10px 14px', borderRadius: 10 }}>
              Manage courses <ArrowRight size={14} />
            </Link>
          </div>
          {/* decorative blob */}
          <div aria-hidden style={{ position: 'absolute', right: -30, top: -30, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.14) 0%, transparent 70%)' }} />
        </div>

        <Panel style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: 0 }}>Next steps</h3>
            <Tag>Provider only</Tag>
          </div>
          <div style={styles.nextSteps}>
            <div style={styles.nextStep}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--teal-soft)', display: 'grid', placeItems: 'center', color: 'var(--teal)', flexShrink: 0 }}><BookOpen size={16} /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Create a focused course</div>
                <div style={styles.muted}>Start with one skill outcome — e.g. “Handle support tickets with CSAT ≥ 4.6”.</div>
              </div>
            </div>
            <div style={styles.nextStep}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--coral-soft)', display: 'grid', placeItems: 'center', color: 'var(--coral)', flexShrink: 0 }}><Layers size={16} /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Structure into modules</div>
                <div style={styles.muted}>2–4 modules keep learners oriented. Each module is one workday of practice.</div>
              </div>
            </div>
            <div style={styles.nextStep}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--teal)', flexShrink: 0 }}><GraduationCap size={16} /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Publish when ready</div>
                <div style={styles.muted}>Drafts are private. Publish makes the course discoverable on Learn.</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <Button variant="secondary" onClick={() => navigate('/company-courses')} style={{ flex: 1 }}><Library size={14} /> Course studio</Button>
            <Link to="/company-courses/new" style={{ flex: 1, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'var(--teal)', color: 'var(--surface)', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}><Plus size={14} /> New course</Link>
          </div>
        </Panel>
      </div>

      {/* Stats */}
      <Panel style={{ marginTop: 18 }}>
        <div style={styles.statGrid}>
          <StatCard value={stats.total} label="total courses" icon={BookOpenCheck} />
          <StatCard value={stats.published} label="published" icon={CheckCircle2} />
          <StatCard value={stats.draft} label="drafts" icon={Clock3} />
          <StatCard value={`${stats.totalModules} · ${stats.totalLessons}`} label="modules · lessons" icon={Layers} />
        </div>
        {stats.total === 0 && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'var(--coral-soft)', fontSize: 12, color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>No courses yet — the studio is empty until you create your first course.</span>
            <Link to="/company-courses/new" style={{ fontWeight: 800, color: 'var(--teal)', textDecoration: 'none' }}>Create course →</Link>
          </div>
        )}
      </Panel>

      {/* Courses table */}
      <section style={styles.section}>
        <div style={styles.sectionTitleRow}>
          <div>
            <h2 style={styles.sectionTitle}>Your courses</h2>
            <p style={{ ...styles.muted, margin: '4px 0 0' }}>{courses.length} course{courses.length === 1 ? '' : 's'} in your workspace · ordered by last update</p>
          </div>
          <Link to="/company-courses" style={{ fontSize: 13, fontWeight: 700 }}>View in studio →</Link>
        </div>
        <Panel>
          {courses.length === 0 ? (
            <EmptyState
              title="Start your course library"
              description="Create a course, add modules and lessons, then publish it when ready. Learners discover published courses on the Learn page."
            >
              <div style={{ marginTop: 14 }}>
                <Button onClick={() => navigate('/company-courses/new')}><Plus size={16} /> Create your first course</Button>
              </div>
            </EmptyState>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Course</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Mode</th>
                    <th style={styles.th}>Curriculum</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => {
                    const published = String(c.status).toLowerCase() === 'published';
                    return (
                      <tr key={c.courseId}>
                        <td style={styles.td}>
                          <div style={styles.title}>{c.name}</div>
                          {c.description && <div style={{ ...styles.muted, marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</div>}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.pill, background: published ? 'var(--teal)' : 'var(--surface)', color: published ? 'var(--surface)' : 'var(--coral)', borderColor: published ? 'var(--teal)' : 'var(--coral)' }}>
                            {published ? <CheckCircle2 size={12} /> : <Clock3 size={12} />} {c.status}
                          </span>
                        </td>
                        <td style={styles.td}>{c.mode || '—'}</td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 700 }}>{c.moduleCount ?? 0} modules</div>
                          <div style={styles.muted}>{c.lessonCount ?? 0} lessons</div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <Link to={`/company-courses/${c.courseId}/edit`} style={{ ...styles.iconBtn, textDecoration: 'none' }} aria-label={`Edit ${c.name}`} title="Edit">
                              <Pencil size={14} />
                            </Link>
                            <Link to={`/courses`} style={{ ...styles.iconBtn, textDecoration: 'none' }} aria-label={`View ${c.name} on Learn`} title="View on Learn">
                              <Eye size={14} />
                            </Link>
                            <button
                              style={{ ...styles.iconBtn, color: 'var(--danger)', borderColor: 'var(--danger-soft)', background: 'var(--danger-soft)' }}
                              aria-label={`Delete ${c.name}`}
                              disabled={deletingId === c.courseId}
                              onClick={() => handleDelete(c)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      {/* Charts */}
      <section style={{ ...styles.section, ...styles.charts }}>
        <Panel>
          <BarList title="Publication status" items={statusItems} />
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={12} /> Published courses are discoverable by learners. Drafts stay private until you publish.
          </div>
        </Panel>
        <Panel>
          {modeItems.length === 0 ? (
            <div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, margin: '0 0 18px' }}>Delivery mode</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Create courses to see your mix of Online, Hybrid and On-site delivery.</p>
            </div>
          ) : (
            <BarList title="Delivery mode" items={modeItems} />
          )}
        </Panel>
      </section>

      {/* Footnote */}
      <Panel style={{ marginTop: 18, background: 'var(--surface2)', borderStyle: 'dashed' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--teal)' }}><Library size={18} /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Provider role — courses only</div>
              <div style={styles.muted}>You can create and manage courses. Job posting and company hiring tools are reserved for employer accounts.</div>
            </div>
          </div>
          <Link to="/help" style={{ fontWeight: 700, fontSize: 13 }}>Help center →</Link>
        </div>
      </Panel>
    </div>
  );
}
