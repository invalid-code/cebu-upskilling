import { useState } from 'react';
import { Sparkles, Tag } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Field from '../ui/Field';
import { api } from '../../api/client';
import { AI_UNAVAILABLE_MESSAGE, courseFromAiDraft, isAiUnavailable } from './studioModel';
import styles from './CourseStudio.module.css';

const range = (values, noun) => values.map((n) => <option key={n} value={n}>{n} {noun}</option>);

/**
 * Optional AI course drafting. A 502/503 shows a neutral notice; nothing else on the page is ever disabled
 * by an AI failure, so manual authoring always continues.
 */
export default function AiDraftPanel({ currentPrice, onDraft }) {
  const [brief, setBrief] = useState('');
  const [level, setLevel] = useState(3);
  const [mode, setMode] = useState('Online');
  const [moduleCount, setModuleCount] = useState(4);
  const [lessonsPerModule, setLessonsPerModule] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [skills, setSkills] = useState([]);
  const [rationale, setRationale] = useState('');

  const generate = async () => {
    if (!brief.trim()) {
      setError('Describe the course you want the AI to build.');
      return;
    }
    setGenerating(true);
    setError('');
    setUnavailable(false);
    try {
      const draft = await api.post('/company/courses/generate', {
        brief: brief.trim(),
        technicalLevel: Number(level),
        mode,
        moduleCount: Number(moduleCount),
        lessonsPerModule: Number(lessonsPerModule),
      });
      onDraft(courseFromAiDraft(draft, currentPrice));
      setSkills(draft.matchedSkills || []);
      setRationale(draft.rationale || '');
    } catch (e) {
      if (isAiUnavailable(e)) setUnavailable(true);
      else setError(e?.message || 'Could not generate a draft');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Panel style={{ marginBottom: 'var(--space-4)', border: '1px solid var(--coral)' }}>
      <div className={styles.aiHead}>
        <Sparkles size={16} color="var(--coral)" aria-hidden="true" />
        <h2 className={styles.aiTitle}>Generate with AI</h2>
        <span className={styles.muted}>Optional — describe what the course should teach and let AI draft it</span>
      </div>
      <div className={styles.stack}>
        <Field
          id="ai-brief"
          label="What should the course teach?"
          hint={`${brief.length} / 4000 characters · Grounded in the platform’s skill catalog`}
        >
          <textarea
            className={styles.input}
            rows={4}
            maxLength={4000}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. A 4-week onboarding for junior customer support agents — handling inquiries, ticketing tools, tone of voice, and escalation. Learners should be job-ready for a BPO setting."
          />
        </Field>
        <div className={styles.grid2}>
          <Field id="ai-level" label="Technical level">
            <select className={styles.input} value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value={1}>1 — Foundational</option>
              <option value={2}>2 — Beginner</option>
              <option value={3}>3 — Intermediate</option>
              <option value={4}>4 — Advanced</option>
              <option value={5}>5 — Expert</option>
            </select>
          </Field>
          <Field id="ai-mode" label="Delivery mode">
            <select className={styles.input} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option>Online</option>
              <option>In-Person</option>
              <option>Hybrid</option>
            </select>
          </Field>
        </div>
        <div className={styles.grid2}>
          <Field id="ai-modules" label="Modules">
            <select className={styles.input} value={moduleCount} onChange={(e) => setModuleCount(e.target.value)}>
              {range([2, 3, 4, 5, 6, 8, 10], 'modules')}
            </select>
          </Field>
          <Field id="ai-lessons" label="Lessons per module">
            <select className={styles.input} value={lessonsPerModule} onChange={(e) => setLessonsPerModule(e.target.value)}>
              {range([1, 2, 3, 4, 5, 6, 8], 'lessons')}
            </select>
          </Field>
        </div>
        {unavailable && <p role="status" className={styles.aiNotice}>{AI_UNAVAILABLE_MESSAGE}</p>}
        {error && <div role="alert" className={styles.fieldError}>{error}</div>}
        <div className={styles.toolbar}>
          <Button onClick={generate} disabled={generating || !brief.trim()}>
            <Sparkles size={16} aria-hidden="true" /> {generating ? 'Generating…' : 'Generate draft into editor'}
          </Button>
          <span className={styles.muted}>Draft will populate the form below — review and save as draft.</span>
        </div>
        {(skills.length > 0 || rationale) && (
          <div className={styles.stack}>
            {rationale && <p className={styles.muted}>{rationale}</p>}
            {skills.length > 0 && (
              <div className={styles.chips}>
                <span className={styles.chipLabel}><Tag size={13} aria-hidden="true" /> Matched skills</span>
                {skills.map((s) => (
                  <span key={s.skillId} className={styles.chip}>{s.name}{s.category ? ` · ${s.category}` : ''}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
