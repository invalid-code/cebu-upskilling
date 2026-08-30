import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Sparkles, Trash2, Save, Tag } from 'lucide-react';
import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import Button from '../components/ui/Button';
import { api } from '../api/client';

const styles = {
  heading: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 18, marginBottom: 28 },
  eyebrow: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--coral)', marginBottom: 12 },
  h1: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(2rem,4vw,3.3rem)' },
  muted: { color: 'var(--muted)' },
  input: { width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14 },
  field: { display: 'grid', gap: 7 },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--muted)' },
  toolbar: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  module: { border: '1px solid var(--line)', borderRadius: 14, background: 'var(--surface)', overflow: 'hidden' },
  loading: { padding: 50, textAlign: 'center', color: 'var(--muted)' },
  skillChip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--surface2)', border: '1px solid var(--line)', fontSize: 12, fontWeight: 600 },
};

function AiModuleEditor({ module, index, onChange, onRemove }) {
  const set = (key, value) => onChange({ ...module, [key]: value });
  return (
    <div style={styles.module}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, background: 'var(--surface2)' }}>
        <BookOpen size={17} color="var(--teal)" />
        <input aria-label={`Module ${index + 1} name`} value={module.name} onChange={(e) => set('name', e.target.value)} placeholder={`Module ${index + 1} title`} style={{ ...styles.input, flex: 1, background: 'transparent', border: 0, padding: 0, fontWeight: 700 }} />
        <button onClick={onRemove} aria-label="Remove module" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
      </div>
      <div style={{ padding: 12 }}>
        {module.description !== undefined && (
          <input aria-label={`Module ${index + 1} description`} value={module.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Module purpose (one sentence)" style={{ ...styles.input, fontSize: 13, marginBottom: 10 }} />
        )}
        {module.lessons.map((lesson, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <FileText size={15} color="var(--muted)" />
            <input aria-label={`Lesson ${i + 1} name`} value={lesson.name} onChange={(e) => set('lessons', module.lessons.map((l, j) => j === i ? { ...l, name: e.target.value } : l))} placeholder={`Lesson ${i + 1} title`} style={{ ...styles.input, flex: 1, fontSize: 13 }} />
            <button onClick={() => set('lessons', module.lessons.filter((_, j) => j !== i))} aria-label="Remove lesson" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => set('lessons', [...module.lessons, { name: '', description: '', order: module.lessons.length }])} style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 12, padding: '12px 0' }}><BookOpen size={14} /> Add lesson</button>
      </div>
    </div>
  );
}

export default function CourseGenerationPage() {
  const navigate = useNavigate();
  const [brief, setBrief] = useState('');
  const [technicalLevel, setTechnicalLevel] = useState(3);
  const [mode, setMode] = useState('Online');
  const [moduleCount, setModuleCount] = useState(4);
  const [lessonsPerModule, setLessonsPerModule] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [committing, setCommitting] = useState(false);

  const generate = async () => {
    if (!brief.trim()) { setError('Describe the course you want the AI to build.'); return; }
    setGenerating(true); setError('');
    try {
      const draft = await api.post('/company/courses/generate', {
        brief: brief.trim(),
        technicalLevel: Number(technicalLevel),
        mode,
        moduleCount: Number(moduleCount),
        lessonsPerModule: Number(lessonsPerModule),
      });
      setPreview(draft);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const updatePreview = (key, value) => setPreview((p) => ({ ...p, [key]: value }));

  const commit = async () => {
    if (!preview) return;
    setCommitting(true); setError('');
    try {
      await api.post('/company/courses/generate/commit', { draft: preview, genreId: null, price: null });
      navigate('/company-courses');
    } catch (e) {
      setError(e.message);
    } finally {
      setCommitting(false);
    }
  };

  if (preview) {
    return (
      <div className="view-enter">
        <div style={styles.heading}>
          <div>
            <Link to="/company-courses/generate"><ArrowLeft size={14} /> Back to generator</Link>
            <div style={styles.eyebrow}>AI draft — review & save</div>
            <h1 style={styles.h1}>Review your draft</h1>
            <p style={{ ...styles.muted, margin: '12px 0 0', maxWidth: 640 }}>{preview.rationale || 'Edit the outline below, then save it as a draft course.'}</p>
          </div>
          <div style={styles.toolbar}>
            <Button variant="secondary" onClick={() => setPreview(null)}><ArrowLeft size={15} /> Back</Button>
            <Button onClick={commit} disabled={committing}><Save size={15} /> {committing ? 'Saving…' : 'Save as draft'}</Button>
          </div>
        </div>
        {error && <div role="alert" style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}
        {preview.matchedSkills?.length > 0 && (
          <Panel style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 6 }}><Tag size={13} /> Matched skills</span>
              {preview.matchedSkills.map((s) => (
                <span key={s.skillId} style={styles.skillChip}>{s.name}{s.category ? ` · ${s.category}` : ''}</span>
              ))}
            </div>
          </Panel>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20 }}>
          <div style={{ display: 'grid', gap: 18 }}>
            <Panel>
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={styles.field}><label style={styles.label}>Course name</label><input value={preview.name} onChange={(e) => updatePreview('name', e.target.value)} style={styles.input} /></div>
                <div style={styles.field}><label style={styles.label}>Description</label><textarea rows="3" value={preview.description || ''} onChange={(e) => updatePreview('description', e.target.value)} style={styles.input} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={styles.field}><label style={styles.label}>Technical level</label>
                    <select value={preview.technicalLevel} onChange={(e) => updatePreview('technicalLevel', Number(e.target.value))} style={styles.input}>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div style={styles.field}><label style={styles.label}>Mode</label>
                    <select value={preview.mode} onChange={(e) => updatePreview('mode', e.target.value)} style={styles.input}>
                      <option>Online</option><option>In-Person</option><option>Hybrid</option>
                    </select>
                  </div>
                </div>
              </div>
            </Panel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><h2>Curriculum</h2><p style={{ ...styles.muted, fontSize: 13 }}>{preview.modules.length} modules · {preview.modules.reduce((a, m) => a + m.lessons.length, 0)} lessons</p></div>
              <Button variant="secondary" onClick={() => updatePreview('modules', [...preview.modules, { name: '', description: '', order: preview.modules.length, lessons: [] }])}><BookOpen size={15} /> Add module</Button>
            </div>
            {preview.modules.length === 0 ? <Panel><EmptyState title="No modules" description="Add a module to save this course." /></Panel>
              : preview.modules.map((module, idx) => (
                <AiModuleEditor key={idx} module={module} index={idx} onChange={(value) => updatePreview('modules', preview.modules.map((m, i) => i === idx ? value : m))} onRemove={() => updatePreview('modules', preview.modules.filter((_, i) => i !== idx))} />
              ))}
          </div>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <Panel>
              <h3 style={{ fontSize: 13, marginBottom: 8 }}>About this draft</h3>
              <p style={{ ...styles.muted, fontSize: 13, lineHeight: 1.6 }}>{preview.rationale || 'No rationale provided.'}</p>
              <div style={{ marginTop: 16, display: 'grid', gap: 6, fontSize: 13 }}>
                <div><strong>Level:</strong> {preview.technicalLevel} / 5</div>
                <div><strong>Mode:</strong> {preview.mode}</div>
                <div><strong>Modules:</strong> {preview.modules.length}</div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <Link to="/company-courses"><ArrowLeft size={14} /> All courses</Link>
          <div style={styles.eyebrow}>Employer tools / AI studio</div>
          <h1 style={styles.h1}>Generate a course with AI</h1>
          <p style={{ ...styles.muted, margin: '12px 0 0', maxWidth: 640 }}>Describe the course in plain language. The AI will ground it in the platform’s skill catalog and draft modules, lessons, and a description — you review it before anything is saved.</p>
        </div>
      </div>
      {error && <div role="alert" style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20 }}>
        <Panel>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={styles.field}>
              <label style={styles.label}>What should the course teach?</label>
              <textarea rows="6" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. A 4-week onboarding for junior customer support agents in Cebu — handling inquiries, ticketing tools, tone of voice, and escalation. Learners should be job-ready for a BPO setting." style={styles.input} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{brief.length} / 4000 characters</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={styles.field}><label style={styles.label}>Technical level</label>
                <select value={technicalLevel} onChange={(e) => setTechnicalLevel(e.target.value)} style={styles.input}>
                  <option value={1}>1 — Foundational</option><option value={2}>2 — Beginner</option><option value={3}>3 — Intermediate</option><option value={4}>4 — Advanced</option><option value={5}>5 — Expert</option>
                </select>
              </div>
              <div style={styles.field}><label style={styles.label}>Delivery mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)} style={styles.input}>
                  <option>Online</option><option>In-Person</option><option>Hybrid</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={styles.field}><label style={styles.label}>Modules</label>
                <select value={moduleCount} onChange={(e) => setModuleCount(e.target.value)} style={styles.input}>
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n} modules</option>)}
                </select>
              </div>
              <div style={styles.field}><label style={styles.label}>Lessons per module</label>
                <select value={lessonsPerModule} onChange={(e) => setLessonsPerModule(e.target.value)} style={styles.input}>
                  {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} lessons</option>)}
                </select>
              </div>
            </div>
            <Button onClick={generate} disabled={generating || !brief.trim()}><Sparkles size={16} /> {generating ? 'Generating…' : 'Generate draft'}</Button>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Skills are matched automatically from the catalog — no manual skill selection needed. You can edit everything after the draft is generated.</p>
          </div>
        </Panel>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Panel>
            <h3 style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><Sparkles size={14} color="var(--coral)" /> How it works</h3>
            <ol style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: '10px 0 0 18px' }}>
              <li>Write a brief — who the course is for and what they should be able to do.</li>
              <li>Gemini drafts the course grounded in your platform’s skill catalog.</li>
              <li>Review the outline, edit titles and descriptions, then save as a draft course.</li>
            </ol>
          </Panel>
          <Panel>
            <h3 style={{ fontSize: 13, marginBottom: 8 }}>Tips for a good brief</h3>
            <ul style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 0 18px' }}>
              <li>Mention the learner persona and their starting point.</li>
              <li>List 2–3 tangible outcomes (e.g. “handle live chat”, “write escalation notes”).</li>
              <li>Note any tools, industries, or constraints.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
