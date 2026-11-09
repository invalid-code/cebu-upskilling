import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Stepper from '../ui/Stepper';
import { api } from '../../api/client';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';
import AutosaveIndicator from './AutosaveIndicator';
import BasicsStep from './BasicsStep';
import { LessonsStep, OutlineStep } from './CurriculumSteps';
import PublishStep from './PublishStep';
import useAutosave from './useAutosave';
import { STUDIO_STEPS, buildCoursePayload } from './studioModel';
import styles from './CourseStudio.module.css';

const LAST_STEP = STUDIO_STEPS.length - 1;
const NAME_REQUIRED = 'Course name is required to publish';

/**
 * Four-step course editor (Basics, Outline, Lessons, Publish). All entered data lives in one `course` state
 * object, so moving between steps never loses it. Existing courses autosave; new courses are created by
 * "Save draft" (or Publish) and then continue on the edit route.
 */
export default function CourseEditor({ courseId, initial }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !courseId;
  const [course, setCourse] = useState(initial);
  const [step, setStep] = useState(() => {
    const requested = location.state?.step;
    return Number.isInteger(requested) && requested >= 0 && requested <= LAST_STEP ? requested : 0;
  });
  const [actionError, setActionError] = useState('');
  const [nameError, setNameError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [leaveTo, setLeaveTo] = useState(null);
  const savedIdRef = useRef(courseId);

  const persist = async (value) => {
    const payload = buildCoursePayload(value);
    const id = savedIdRef.current;
    const saved = id ? await api.put(`/company/courses/${id}`, payload) : await api.post('/company/courses', payload);
    if (!id && saved?.courseId != null) savedIdRef.current = saved.courseId;
    return saved;
  };

  const autosave = useAutosave({ value: course, enabled: !isNew, save: persist });
  const { blocked, stay, proceed } = useUnsavedChangesPrompt(autosave.dirty && !leaveTo);

  // Navigate only after the unsaved-changes guard has been released by the re-render.
  useEffect(() => {
    if (leaveTo) navigate(leaveTo.path, { replace: true, state: leaveTo.state });
  }, [leaveTo, navigate]);

  const update = (key, value) => {
    setCourse((c) => ({ ...c, [key]: value }));
    if (key === 'name' && value.trim()) setNameError('');
  };

  const leave = (path, state) => {
    autosave.markClean();
    setLeaveTo({ path, state });
  };

  const saveDraft = async () => {
    setActionError('');
    const ok = await autosave.saveNow();
    if (ok && isNew && savedIdRef.current) {
      leave(`/company-courses/${savedIdRef.current}/edit`, { step });
    }
  };

  const publish = async () => {
    setActionError('');
    if (!course.name.trim()) {
      setNameError(NAME_REQUIRED);
      return;
    }
    setPublishing(true);
    try {
      const ok = await autosave.saveNow();
      if (!ok || !savedIdRef.current) return;
      await api.post(`/company/courses/${savedIdRef.current}/publish`);
      leave('/company-courses');
    } catch (e) {
      setActionError(e?.message || 'Could not publish the course');
    } finally {
      setPublishing(false);
    }
  };

  const saving = autosave.status === 'saving';

  return (
    <div className="view-enter">
      <div className={styles.heading}>
        <div>
          <Link to="/company-courses" className={styles.backLink}><ArrowLeft size={14} aria-hidden="true" /> All courses</Link>
          <div className={styles.eyebrow}>{isNew ? 'New curriculum' : 'Edit curriculum'}</div>
          <h1 className={styles.title}>{isNew ? 'Create a course' : 'Shape this course'}</h1>
        </div>
        <div className={styles.toolbar}>
          <AutosaveIndicator status={autosave.status} persisted={!isNew} />
          <Button variant="secondary" onClick={saveDraft} disabled={saving || publishing}>
            <Save size={15} aria-hidden="true" /> Save draft
          </Button>
        </div>
      </div>

      {autosave.status === 'failed' && (
        <div role="alert" className={styles.errorBanner}>
          {autosave.error}. Your edits are still in the form
          {!isNew ? ' and we will retry automatically.' : '. Use Save draft to try again.'}
        </div>
      )}
      {actionError && <div role="alert" className={styles.errorBanner}>{actionError}</div>}

      <div className={styles.stepperWrap}>
        <Stepper steps={STUDIO_STEPS} current={step} onSelect={setStep} />
      </div>

      {step === 0 && (
        <BasicsStep
          course={course}
          update={update}
          isNew={isNew}
          nameError={nameError}
          onAiDraft={setCourse}
        />
      )}
      {step === 1 && <OutlineStep course={course} update={update} goToLessons={() => setStep(2)} />}
      {step === 2 && <LessonsStep course={course} update={update} />}
      {step === 3 && <PublishStep course={course} busy={saving || publishing} nameError={nameError} onPublish={publish} />}

      <div className={styles.stepActions}>
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft size={15} aria-hidden="true" /> Back
        </Button>
        {step < LAST_STEP && (
          <Button variant="ghost" onClick={() => setStep((s) => Math.min(LAST_STEP, s + 1))}>
            Next <ArrowRight size={15} aria-hidden="true" />
          </Button>
        )}
      </div>

      <Modal
        open={blocked}
        onClose={stay}
        title="Discard unsaved changes?"
        footer={(
          <>
            <Button variant="ghost" onClick={stay}>Keep editing</Button>
            <Button variant="primary" onClick={proceed}>Leave without saving</Button>
          </>
        )}
      >
        <p>You have unsaved changes to this course. If you leave now they will be lost.</p>
      </Modal>
    </div>
  );
}
