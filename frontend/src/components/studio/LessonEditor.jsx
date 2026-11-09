import { useId, useState } from 'react';
import { ChevronDown, FileText, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { renderMarkdown } from '../../lib/markdown';
import {
  DOCUMENT_LIMIT_MESSAGE,
  VIDEO_LIMIT_MESSAGE,
  markdownOfLesson,
  validateAttachDocument,
  validateVideoFile,
} from './studioModel';
import styles from './CourseStudio.module.css';

/** One lesson: title row plus an expandable markdown editor and video/file attachments. */
export default function LessonEditor({ lesson, index, onChange, onRemove }) {
  const uid = useId();
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  // { kind: 'video' | 'documents', message } - the field error belongs to the upload field that produced it.
  const [mediaError, setMediaError] = useState(null);
  const set = (key, value) => onChange({ ...lesson, [key]: value });
  const markdown = markdownOfLesson(lesson);
  const media = lesson.media || [];

  const uploadFile = async (file, kind) => {
    if (!file || !lesson.lessonId) return;
    const precheck = kind === 'video' ? validateVideoFile(file) : validateAttachDocument(file);
    if (precheck) {
      setMediaError({ kind, message: precheck });
      return;
    }
    setMediaError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.postForm(`/media/lessons/${lesson.lessonId}/${kind}`, form);
      set('media', [...media, res]);
    } catch (e) {
      // On 413 the rejected file is discarded (never added to the lesson) and all other data is untouched.
      const message = e?.status === 413
        ? (kind === 'video' ? VIDEO_LIMIT_MESSAGE : DOCUMENT_LIMIT_MESSAGE)
        : (e?.message || 'Could not attach file');
      setMediaError({ kind, message });
    } finally {
      setUploading(false);
    }
  };

  const errorId = `${uid}-media-error`;
  const errorFor = (kind) => (mediaError?.kind === kind ? mediaError.message : null);
  const onPick = (kind) => (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) uploadFile(f, kind);
  };

  return (
    <div className={styles.lesson}>
      <div className={styles.lessonRow}>
        <FileText size={15} aria-hidden="true" color="var(--muted)" />
        <input
          aria-label={`Lesson ${index + 1} name`}
          className={`${styles.input} ${styles.inputSmall}`}
          value={lesson.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={`Lesson ${index + 1} title`}
        />
        <button
          type="button"
          className={`${styles.iconButton} ${styles.mutedButton}`}
          onClick={() => setExpanded((v) => !v)}
          aria-label={`Toggle content for lesson ${index + 1}`}
          aria-expanded={expanded}
        >
          <ChevronDown size={15} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
        </button>
        <button type="button" className={styles.iconButton} onClick={onRemove} aria-label={`Remove lesson ${index + 1}`}>
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && (
        <div className={styles.lessonDetail}>
          <textarea
            aria-label={`Lesson ${index + 1} description`}
            className={`${styles.input} ${styles.inputSmall}`}
            rows={2}
            value={lesson.description || ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Short summary shown to learners…"
          />
          <div className={styles.toolbar}>
            <div role="tablist" aria-label="Content editor mode" className={styles.editorTabs}>
              <button
                type="button"
                role="tab"
                aria-selected={!preview}
                className={`${styles.editorTab} ${!preview ? styles.editorTabActive : ''}`}
                onClick={() => setPreview(false)}
              >
                Write
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={preview}
                className={`${styles.editorTab} ${preview ? styles.editorTabActive : ''}`}
                onClick={() => setPreview(true)}
              >
                Preview
              </button>
            </div>
            <span className={styles.muted}>Markdown supported</span>
          </div>
          {preview ? (
            markdown.trim()
              ? (
                <div
                  aria-label={`Lesson ${index + 1} preview`}
                  className={`${styles.input} ${styles.preview}`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
                />
              )
              : <p className={styles.muted}>Nothing to preview yet — write some Markdown first.</p>
          ) : (
            <textarea
              aria-label={`Lesson ${index + 1} content`}
              className={`${styles.input} ${styles.mono}`}
              rows={10}
              value={markdown}
              onChange={(e) => set('markdown', e.target.value)}
              placeholder={'# Heading\n\nWrite the lesson in Markdown…\n\n```\ncode example\n```'}
            />
          )}
          <div className={styles.mediaBlock}>
            <div className={styles.mediaTitle}>Video &amp; files</div>
            {media.length > 0 && (
              <ul className={styles.mediaList}>
                {media.map((m) => (
                  <li key={m.mediaId}>
                    {(m.pathFile || '').split('/').pop()} · {(m.type || '').toUpperCase()} · {m.mbSize?.toFixed(1)} MB
                  </li>
                ))}
              </ul>
            )}
            {lesson.lessonId ? (
              <>
                <div className={styles.mediaActions}>
                  <label className={`${styles.fileLabel} ${uploading ? styles.fileLabelBusy : ''}`}>
                    <Plus size={13} aria-hidden="true" /> {uploading ? 'Uploading…' : 'Attach video'}
                    <input
                      type="file"
                      className={styles.fileInput}
                      aria-label={`Attach video to lesson ${index + 1}`}
                      aria-invalid={errorFor('video') ? 'true' : undefined}
                      aria-describedby={errorFor('video') ? errorId : undefined}
                      accept="video/*"
                      disabled={uploading}
                      onChange={onPick('video')}
                    />
                  </label>
                  <label className={`${styles.fileLabel} ${uploading ? styles.fileLabelBusy : ''}`}>
                    <Plus size={13} aria-hidden="true" /> {uploading ? 'Uploading…' : 'Attach file'}
                    <input
                      type="file"
                      className={styles.fileInput}
                      aria-label={`Attach file to lesson ${index + 1}`}
                      aria-invalid={errorFor('documents') ? 'true' : undefined}
                      aria-describedby={errorFor('documents') ? errorId : undefined}
                      accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                      disabled={uploading}
                      onChange={onPick('documents')}
                    />
                  </label>
                </div>
                {mediaError && (
                  <p id={errorId} role="alert" className={styles.fieldError}>{mediaError.message}</p>
                )}
              </>
            ) : (
              <p className={styles.muted}>Save the course first, then attach video and files here.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
