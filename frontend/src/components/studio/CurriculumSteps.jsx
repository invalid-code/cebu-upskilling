import { BookOpen, Plus, Trash2 } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import EmptyState from '../shared/EmptyState';
import LessonEditor from './LessonEditor';
import styles from './CourseStudio.module.css';

/** Step 2: modules (name and summary). Lessons are authored in step 3. */
export function OutlineStep({ course, update, goToLessons }) {
  const setModule = (index, value) => update('modules', course.modules.map((m, i) => (i === index ? value : m)));
  const addModule = () =>
    update('modules', [...course.modules, { name: '', description: '', order: course.modules.length, lessons: [] }]);

  return (
    <div className={styles.stack}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Curriculum</h2>
          <p className={styles.muted}>Organize the learning journey into focused modules.</p>
        </div>
        <Button variant="secondary" onClick={addModule}><Plus size={15} aria-hidden="true" /> Add module</Button>
      </div>
      {course.modules.length === 0 ? (
        <Panel>
          <EmptyState
            title="No modules yet"
            description="Add your first module to give learners a clear starting point."
          />
        </Panel>
      ) : (
        course.modules.map((module, index) => (
          <div key={index} className={styles.module}>
            <div className={styles.moduleHead}>
              <BookOpen size={17} color="var(--teal)" aria-hidden="true" />
              <input
                aria-label={`Module ${index + 1} name`}
                className={styles.moduleName}
                value={module.name}
                onChange={(e) => setModule(index, { ...module, name: e.target.value })}
                placeholder={`Module ${index + 1} title`}
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => update('modules', course.modules.filter((_, i) => i !== index))}
                aria-label={`Remove module ${index + 1}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className={styles.moduleBody}>
              <textarea
                aria-label={`Module ${index + 1} description`}
                className={`${styles.input} ${styles.inputSmall}`}
                rows={2}
                value={module.description || ''}
                onChange={(e) => setModule(index, { ...module, description: e.target.value })}
                placeholder="What does this module cover?"
              />
              <p className={styles.note}>
                {module.lessons.length} lesson{module.lessons.length === 1 ? '' : 's'}.{' '}
                <button type="button" className={styles.ghostButton} onClick={goToLessons}>Edit lessons</button>
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/** Step 3: lessons inside each module. */
export function LessonsStep({ course, update }) {
  const setModule = (index, value) => update('modules', course.modules.map((m, i) => (i === index ? value : m)));

  if (course.modules.length === 0) {
    return (
      <Panel>
        <EmptyState title="Add a module first" description="Lessons live inside modules. Add one in the Outline step." />
      </Panel>
    );
  }

  return (
    <div className={styles.stack}>
      {course.modules.map((module, index) => {
        const setLessons = (lessons) => setModule(index, { ...module, lessons });
        return (
          <div key={index} className={styles.module}>
            <div className={styles.moduleHead}>
              <BookOpen size={17} color="var(--teal)" aria-hidden="true" />
              <strong>{module.name || `Module ${index + 1}`}</strong>
            </div>
            <div className={styles.moduleBody}>
              {module.lessons.map((lesson, i) => (
                <LessonEditor
                  key={i}
                  lesson={lesson}
                  index={i}
                  onChange={(value) => setLessons(module.lessons.map((l, j) => (j === i ? value : l)))}
                  onRemove={() => setLessons(module.lessons.filter((_, j) => j !== i))}
                />
              ))}
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setLessons([...module.lessons, { name: '', description: '', order: module.lessons.length, contents: [] }])}
              >
                <Plus size={14} aria-hidden="true" /> Add lesson
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
