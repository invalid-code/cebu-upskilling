import { Download, FileText, Package, Plus, Save, HelpCircle } from 'lucide-react';

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
  },
};

export default function LessonResources({ media }) {
  const resources = [
    { name: 'Lesson transcript', type: 'PDF', size: '4 pages', iconType: 'pdf' },
    { name: 'Practice files', type: 'ZIP', size: '3 files', iconType: 'zip' },
  ];

  const displayResources = media && media.length > 0
    ? media.map(m => ({
        name: m.pathFile.split('/').pop(),
        type: m.type.toUpperCase(),
        size: `${m.mbSize.toFixed(1)} MB`,
        iconType: m.type.toLowerCase() === 'pdf' ? 'pdf' : 'zip',
      }))
    : resources;

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Lesson resources</span>
          <button style={styles.sectionAction}>
            <Download size={16} />
          </button>
        </div>
        {displayResources.map((resource, index) => (
          <div
            key={index}
            style={{
              ...styles.resourceItem,
              ...(index === displayResources.length - 1 ? styles.resourceItemLast : {}),
            }}
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
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>My notes</span>
          <button style={styles.sectionAction}>
            <Plus size={16} />
          </button>
        </div>
        <div style={styles.notesContent}>
          <div style={styles.savedNote}>
            <div style={styles.savedNoteText}>
              Remember: a closure keeps access to its original scope.
            </div>
          </div>
          <textarea
            style={styles.noteInput}
            placeholder="Add a note about this lesson..."
          />
          <button style={styles.saveButton}>
            <Save size={14} style={{ marginRight: 6 }} />
            Save note
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.helpContent}>
          <div style={styles.sectionTitle}>Need help?</div>
          <div style={styles.helpText}>
            Ask the learning community about this lesson.
          </div>
          <a style={styles.helpLink}>
            <HelpCircle size={14} />
            Join discussion →
          </a>
        </div>
      </div>
    </div>
  );
}
