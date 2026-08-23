import { useState, useEffect } from 'react';
import { Download, FileText, Package, Save, HelpCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import DiscussionModal from './DiscussionModal';
import { SkeletonText, SkeletonStatus } from '../ui/Skeleton';

const styles = {
  container: {
    width: 280,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  section: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--line)',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid var(--line)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--ink)',
  },
  sectionAction: {
    background: 'transparent',
    border: 0,
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: 4,
  },
  resourceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    borderBottom: '1px solid var(--line)',
  },
  resourceItemLast: {
    borderBottom: 0,
  },
  resourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  resourceIconPdf: {
    background: 'var(--coral-soft)',
    color: 'var(--coral)',
  },
  resourceIconZip: {
    background: 'var(--teal-soft)',
    color: 'var(--teal)',
  },
  resourceInfo: {
    flex: 1,
    minWidth: 0,
  },
  resourceName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: 2,
  },
  resourceMeta: {
    fontSize: 11,
    color: 'var(--muted)',
  },
  notesContent: {
    padding: 16,
  },
  notesList: {
    maxHeight: 220,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    marginBottom: 12,
    paddingRight: 2,
  },
  noteInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid var(--line)',
    borderRadius: 8,
    fontSize: 13,
    color: 'var(--ink)',
    resize: 'vertical',
    minHeight: 80,
    fontFamily: 'inherit',
    marginBottom: 12,
  },
  savedNote: {
    padding: '12px',
    background: 'var(--teal-soft)',
    borderRadius: 8,
    marginBottom: 12,
  },
  savedNoteText: {
    fontSize: 13,
    color: 'var(--ink)',
    lineHeight: 1.5,
  },
  savedNoteMeta: {
    fontSize: 11,
    color: 'var(--muted)',
    marginTop: 6,
  },
  saveButton: {
    width: '100%',
    padding: '10px 16px',
    background: 'var(--teal)',
    color: 'var(--surface)',
    border: 0,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginBottom: 8,
  },
  helpContent: {
    padding: 16,
  },
  helpText: {
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 12,
    lineHeight: 1.5,
  },
  helpLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--teal)',
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'transparent',
    border: 0,
    padding: 0,
  },
};

export default function LessonResources({ media, lessonId, courseId }) {
  const { showToast } = useToast();
  const [noteInput, setNoteInput] = useState('');
  const [savedNote, setSavedNote] = useState(null);
  const [savedUpdatedAt, setSavedUpdatedAt] = useState(null);
  const [courseNotes, setCourseNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discussionOpen, setDiscussionOpen] = useState(false);

  const displayResources = media && media.length > 0
    ? media.map(m => ({
        name: m.pathFile.split('/').pop(),
        href: m.pathFile,
        type: m.type.toUpperCase(),
        size: `${m.mbSize.toFixed(1)} MB`,
        iconType: m.type.toLowerCase() === 'pdf' ? 'pdf' : 'zip',
      }))
    : [];

  const triggerDownload = (href, fileName) => {
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = fileName || '';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadAll = () => {
    displayResources.forEach((r) => triggerDownload(r.href, r.name));
  };

  useEffect(() => {
    if (!lessonId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    // Still prime the editor with the latest single-note fetch for backward compat,
    // but the list below is driven by courseNotes so multiple notes per lesson will show.
    api.get(`/notes/lessons/${lessonId}`, { signal: controller.signal })
      .then((data) => {
        if (data?.content) {
          setSavedNote(data.content);
          setSavedUpdatedAt(data.updatedAt);
        } else {
          setSavedNote(null);
          setSavedUpdatedAt(null);
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        if (err.message?.includes('not enrolled') || err.message?.includes('not found')) {
          setSavedNote(null);
        } else if (err.message !== 'HTTP 404') {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [lessonId]);

  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    api.get(`/notes/courses/${courseId}`, { signal: controller.signal })
      .then((data) => {
        setCourseNotes(data?.notes || []);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setCourseNotes([]);
      });
    return () => controller.abort();
  }, [courseId]);

  const handleSave = async () => {
    const trimmed = noteInput.trim();
    if (!trimmed) {
      setError('Note content is required');
      return;
    }
    if (trimmed.length > 20000) {
      setError('Note content must not exceed 20000 characters');
      return;
    }
    if (!lessonId) {
      setError('No lesson selected');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await api.put(`/notes/lessons/${lessonId}`, { content: trimmed });
      setSavedNote(data.content);
      setSavedUpdatedAt(data.updatedAt);
      setNoteInput('');
      // refresh course-wide list so the new private note appears in the list below
      if (courseId) {
        try {
          const courseData = await api.get(`/notes/courses/${courseId}`);
          setCourseNotes(courseData?.notes || []);
        } catch { /* ignore */ }
      }
      showToast('Note saved');
    } catch (err) {
      setError(err.message || 'Failed to save note');
      showToast(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {displayResources.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Lesson resources</span>
            <button style={styles.sectionAction} onClick={handleDownloadAll} aria-label="Download all lesson files">
              <Download size={16} />
            </button>
          </div>
          {displayResources.map((resource, index) => (
            <a
              key={index}
              href={resource.href}
              download={resource.name}
              target="_blank"
              rel="noopener"
              onClick={(e) => {
                // Use direct download attribute; no backend update is triggered
                // Fallback for browsers that ignore download on cross-origin
                if (!resource.href) e.preventDefault();
              }}
              style={{
                ...styles.resourceItem,
                ...(index === displayResources.length - 1 ? styles.resourceItemLast : {}),
                textDecoration: 'none',
                color: 'inherit',
              }}
              aria-label={`Download ${resource.name}`}
            >
              <div
                style={{
                  ...styles.resourceIcon,
                  ...(resource.iconType === 'pdf' ? styles.resourceIconPdf : styles.resourceIconZip),
                }}
              >
                {resource.iconType === 'pdf' ? <FileText size={16} /> : <Package size={16} />}
              </div>
              <div style={styles.resourceInfo}>
                <div style={styles.resourceName}>{resource.name}</div>
                <div style={styles.resourceMeta}>
                  {resource.type} · {resource.size}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>My notes</span>
        </div>
        <div style={styles.notesContent}>
          {loading ? (
            <SkeletonStatus label="Loading notes...">
              <SkeletonText lines={3} lineHeight={12} gap={8} lastWidth="40%" />
            </SkeletonStatus>
          ) : courseNotes.filter((n) => n.lessonId === lessonId && n.content).length > 0 ? (
            <div style={styles.notesList}>
              {courseNotes
                .filter((n) => n.lessonId === lessonId && n.content)
                .slice()
                .reverse()
                .map((n, idx) => (
                  <div key={`${n.lessonId}-${n.updatedAt}-${idx}`} style={styles.savedNote}>
                    <div style={styles.savedNoteText}>{n.content}</div>
                    {n.updatedAt && (
                      <div style={styles.savedNoteMeta}>Saved {new Date(n.updatedAt).toLocaleString()}</div>
                    )}
                  </div>
                ))}
            </div>
          ) : savedNote ? (
            <div style={styles.savedNote}>
              <div style={styles.savedNoteText}>{savedNote}</div>
              {savedUpdatedAt && (
                <div style={styles.savedNoteMeta}>Saved {new Date(savedUpdatedAt).toLocaleString()}</div>
              )}
            </div>
          ) : null}
          <textarea
            style={styles.noteInput}
            placeholder="Add a note about this lesson..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            maxLength={20000}
            disabled={saving}
          />
          {error && <div style={styles.errorText}>{error}</div>}
          <button
            style={{
              ...styles.saveButton,
              ...(saving || !noteInput.trim() ? styles.saveButtonDisabled : {}),
            }}
            onClick={handleSave}
            disabled={saving || !noteInput.trim()}
          >
            <Save size={14} style={{ marginRight: 6 }} />
            {saving ? 'Saving...' : 'Save note'}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.helpContent}>
          <div style={styles.sectionTitle}>Need help?</div>
          <div style={styles.helpText}>
            Ask the learning community about this lesson.
          </div>
          <button
            type="button"
            style={styles.helpLink}
            onClick={() => setDiscussionOpen(true)}
          >
            <HelpCircle size={14} />
            Join discussion →
          </button>
        </div>
      </div>

      <DiscussionModal
        open={discussionOpen}
        onClose={() => setDiscussionOpen(false)}
        lessonId={lessonId}
      />
    </div>
  );
}
