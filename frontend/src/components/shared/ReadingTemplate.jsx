import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Panel from '../ui/Panel';
import Footer from '../Layout/Footer';
import styles from './ReadingTemplate.module.css';

/**
 * Shared reading template for legal pages (/privacy, /terms).
 * All typography (font family, size, line height, max content width) is defined in
 * ReadingTemplate.module.css so every page rendered through it is identical.
 *
 * Props: title, intro, updated, sections [{ title, body }], note { icon: Icon, children }
 */
export default function ReadingTemplate({ title, intro, updated = 'August 2026', sections, note }) {
  const NoteIcon = note?.icon;
  return (
    <div className={`view-enter ${styles.page}`} data-testid="reading-template">
      <main className={styles.inner} id="main-content">
        <Link to="/" className={styles.back}>
          <ArrowLeft size={15} aria-hidden="true" /> Back to CebuUpskilling
        </Link>
        <div className={styles.eyebrow}>Legal</div>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.updatedRow}>
          <span className={styles.draftBadge}>Draft for review</span>
          <p className={styles.updated}>Last updated: {updated}</p>
        </div>
        <p className={styles.intro}>{intro}</p>
        {sections.map((section) => (
          <Panel key={section.title} style={{ marginBottom: 16 }}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <p className={styles.body}>{section.body}</p>
          </Panel>
        ))}
        {note && (
          <Panel style={{ marginBottom: 16 }}>
            <div className={styles.note}>
              {NoteIcon && <NoteIcon size={22} className={styles.noteIcon} aria-hidden="true" />}
              <p className={styles.body}>{note.children}</p>
            </div>
          </Panel>
        )}
      </main>
      <Footer />
    </div>
  );
}
