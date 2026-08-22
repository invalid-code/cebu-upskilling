import { FileText } from 'lucide-react';

const styles = {
  container: {
    flex: 1,
    minWidth: 0,
  },
  moduleLabel: {
    fontSize: 12,
    color: 'var(--muted)',
    marginBottom: 4,
  },
  lessonTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 16,
  },
  contentBlock: {
    marginBottom: 20,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 1.7,
    color: 'var(--ink)',
    marginBottom: 16,
  },
  heading: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--ink)',
    marginTop: 24,
    marginBottom: 12,
  },
  codeBlock: {
    background: '#1a2e27',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  codeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  codeFileName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'monospace',
  },
  codeContent: {
    padding: '16px',
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: 'monospace',
    color: '#e8f0ee',
    overflowX: 'auto',
  },

};

export default function LessonContent({ lesson, moduleNumber, lessonNumber }) {
  if (!lesson) return null;

  const renderContentBlock = (block, index) => {
    switch (block.blockType) {
      case 'text':
      case 'paragraph':
        return (
          <div key={index} style={styles.paragraph}>
            {block.content}
          </div>
        );
      case 'heading':
        return (
          <h3 key={index} style={styles.heading}>
            {block.content}
          </h3>
        );
      case 'code':
        return (
          <div key={index} style={styles.codeBlock}>
            <div style={styles.codeHeader}>
              <span style={styles.codeFileName}>example.js</span>
              <FileText size={14} color="rgba(255,255,255,0.5)" />
            </div>
            <pre style={styles.codeContent}>
              <code>{block.content}</code>
            </pre>
          </div>
        );
      default:
        return (
          <div key={index} style={styles.paragraph}>
            {block.content}
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      {moduleNumber != null && lessonNumber != null && (
        <div style={styles.moduleLabel}>
          Module {moduleNumber} · Lesson {lessonNumber}
        </div>
      )}
      <h2 style={styles.lessonTitle}>{lesson.name}</h2>

      {lesson.contentBlocks.map((block, index) =>
        renderContentBlock(block, index)
      )}

      {lesson.contentBlocks.length === 0 && lesson.description && (
        <div style={styles.paragraph}>{lesson.description}</div>
      )}
    </div>
  );
}
