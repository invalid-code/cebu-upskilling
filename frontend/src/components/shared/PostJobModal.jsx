import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Tag from '../ui/Tag';
import { api } from '../../api/client';
import { X, Trash2 } from 'lucide-react';

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(10, 25, 20, 0.55)',
    display: 'grid', placeItems: 'center', zIndex: 100, padding: 20,
  },
  modal: {
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 'var(--radius-lg)', width: 'min(640px, 100%)',
    maxHeight: '90vh', overflowY: 'auto', padding: 26,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, margin: 0 },
  closeBtn: { background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--muted)', padding: 6, borderRadius: 8 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 },
  field: {
    background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10,
    minHeight: 42, padding: '9px 12px', color: 'var(--ink)', fontSize: 14,
    width: '100%', boxSizing: 'border-box',
  },
  textarea: {
    background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10,
    padding: '9px 12px', color: 'var(--ink)', fontSize: 14,
    width: '100%', boxSizing: 'border-box', minHeight: 90, resize: 'vertical', fontFamily: 'inherit',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
  group: { marginBottom: 14 },
  skillRow: { display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: 8, marginBottom: 8, alignItems: 'center' },
  skillList: { marginTop: 4 },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  hint: { fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' },
};

const LEVEL_OPTIONS = [
  [1, '1 · No Knowledge'],
  [2, '2 · Beginner'],
  [3, '3 · Intermediate'],
  [4, '4 · Advanced'],
  [5, '5 · Expert'],
];

export default function PostJobModal({ companyId, recruiterId, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('Full-time');
  const [skills, setSkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(3);
  const [requiredSkills, setRequiredSkills] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/skills/list')
      .then((data) => { if (alive) setSkills(data || []); })
      .catch(() => { if (alive) setSkills([]); });
    return () => { alive = false; };
  }, []);

  const addSkill = () => {
    const skill = skills.find((s) => s.skillId === Number(selectedSkillId));
    if (!skill || requiredSkills.some((rs) => rs.skillId === skill.skillId)) return;
    setRequiredSkills((prev) => [...prev, { skillId: skill.skillId, skillName: skill.name, requiredLevel: selectedLevel }]);
    setSelectedSkillId('');
    setSelectedLevel(3);
  };

  const submit = async () => {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    try {
      const post = await api.post('/posts', {
        recruiterId,
        companyId,
        title: title.trim(),
        targetRole: targetRole.trim() || title.trim(),
        description: description.trim() || null,
        schedule,
        requiredSkills: requiredSkills.map((rs) => ({ skillId: rs.skillId, requiredLevel: rs.requiredLevel })),
      });
      onCreated(post);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not post job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.preventDefault()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Post a job</h3>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Title</label>
          <input className="field" style={styles.field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Junior Frontend Developer" />
        </div>

        <div style={styles.row}>
          <div>
            <label style={styles.label}>Target role</label>
            <input className="field" style={styles.field} value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Frontend Developer" />
          </div>
          <div>
            <label style={styles.label}>Schedule</label>
            <select className="field" style={styles.field} value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Side-hustle</option>
            </select>
          </div>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Description</label>
          <textarea style={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Role summary, location, salary or rate…" />
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Required skills</label>
          <div style={styles.skillRow}>
            <select className="field" style={styles.field} value={selectedSkillId} onChange={(e) => setSelectedSkillId(e.target.value)}>
              <option value="">Select a skill…</option>
              {skills.map((skill) => (
                <option key={skill.skillId} value={skill.skillId}>{skill.name}</option>
              ))}
            </select>
            <select className="field" style={styles.field} value={selectedLevel} onChange={(e) => setSelectedLevel(Number(e.target.value))}>
              {LEVEL_OPTIONS.map(([level, label]) => (
                <option key={level} value={level}>{label}</option>
              ))}
            </select>
            <Button variant="primary" style={{ minHeight: 42, padding: '0 10px' }} onClick={addSkill} disabled={!selectedSkillId}>
              +
            </Button>
          </div>
          {requiredSkills.length > 0 && (
            <div style={styles.skillList}>
              {requiredSkills.map((rs) => (
                <div key={rs.skillId} style={styles.skillRow}>
                  <Tag style={{ width: '100%' }}>{rs.skillName}</Tag>
                  <select
                    className="field"
                    style={styles.field}
                    value={rs.requiredLevel}
                    onChange={(e) => setRequiredSkills((prev) =>
                      prev.map((item) => (item.skillId === rs.skillId ? { ...item, requiredLevel: Number(e.target.value) } : item)))}
                  >
                    {LEVEL_OPTIONS.map(([level, label]) => (
                      <option key={level} value={level}>{label}</option>
                    ))}
                  </select>
                  <button
                    style={{ ...styles.closeBtn, border: '1px solid var(--line)', borderRadius: 8, display: 'grid', placeItems: 'center' }}
                    onClick={() => setRequiredSkills((prev) => prev.filter((item) => item.skillId !== rs.skillId))}
                    aria-label={`Remove ${rs.skillName}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p style={styles.hint}>These required skills are used to match learners and forecast demand.</p>
        </div>

        {error && <p style={{ color: 'var(--coral)', fontSize: 13, margin: '0 0 10px' }}>{error}</p>}

        <div style={styles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Posting…' : 'Post job'}
          </Button>
        </div>
      </div>
    </div>
  );
}