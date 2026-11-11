import { Award } from 'lucide-react';
import Panel from '../ui/Panel';
import Field from '../ui/Field';
import AiDraftPanel from './AiDraftPanel';
import styles from './CourseStudio.module.css';

/** Step 1: name, description, delivery details and certificate opt-in (plus AI drafting when creating). */
export default function BasicsStep({ course, update, isNew, onAiDraft, nameError }) {
  return (
    <div className={styles.stack}>
      {isNew && <AiDraftPanel currentPrice={course.price} onDraft={onAiDraft} />}
      <Panel>
        <div className={styles.stack}>
          <Field id="course-name" label="Course name" error={nameError}>
            <input
              className={styles.input}
              value={course.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Modern customer support fundamentals"
            />
          </Field>
          <Field id="course-description" label="Description">
            <textarea
              className={styles.input}
              rows={4}
              value={course.description || ''}
              onChange={(e) => update('description', e.target.value)}
              placeholder="What will learners be able to do?"
            />
          </Field>
        </div>
      </Panel>
      <Panel>
        <div className={styles.sectionHead}>
          <Award size={17} color="var(--teal)" aria-hidden="true" />
          <h2 className={styles.sectionTitle}>Certificate</h2>
        </div>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={Boolean(course.issuesCertificate)}
            onChange={(e) => update('issuesCertificate', e.target.checked)}
          />
          <span className={styles.checkLabel}>Issue a certificate on completion</span>
        </label>
        <p className={styles.note}>
          Learners who reach 100% receive a certificate in their Credentials page. Saving also issues certificates to
          learners who already completed this course. Turning this off stops new certificates; previously issued
          credentials remain valid.
        </p>
        {course.courseId && course.certificatesIssued > 0 && (
          <p className={styles.issued}>
            {course.certificatesIssued} certificate{course.certificatesIssued === 1 ? '' : 's'} issued so far
          </p>
        )}
      </Panel>
    </div>
  );
}
