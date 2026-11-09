import { Check, Send, X } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import styles from './CourseStudio.module.css';

/** Step 4: readiness checklist and the publish action. */
export default function PublishStep({ course, busy, nameError, onPublish }) {
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const checks = [
    { ok: Boolean(course.name.trim()), text: 'Course has a name' },
    { ok: course.modules.length > 0, text: `${course.modules.length} module${course.modules.length === 1 ? '' : 's'}` },
    { ok: lessonCount > 0, text: `${lessonCount} lesson${lessonCount === 1 ? '' : 's'}` },
  ];
  return (
    <Panel>
      <h2 className={styles.sectionTitle}>Ready to publish?</h2>
      <p className={styles.muted}>Published courses appear in the learner catalog. You can keep editing afterwards.</p>
      <ul className={styles.checklist} style={{ marginTop: 'var(--space-4)' }}>
        {checks.map((c) => (
          <li key={c.text} className={`${styles.checkItem} ${c.ok ? styles.checkOk : styles.checkMissing}`}>
            {c.ok ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
            <span>{c.text}</span>
            <span className={styles.muted}>{c.ok ? '(done)' : '(needs attention)'}</span>
          </li>
        ))}
      </ul>
      {nameError && <p role="alert" className={styles.fieldError}>{nameError}</p>}
      <Button onClick={onPublish} disabled={busy}><Send size={15} aria-hidden="true" /> Publish</Button>
    </Panel>
  );
}
