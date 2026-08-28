import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Footer from '../components/Layout/Footer';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg)',
  },
  inner: {
    width: '100%',
    maxWidth: 860,
    margin: '0 auto',
    padding: '48px clamp(20px, 4vw, 40px) 0',
    flex: 1,
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 26,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 700,
    color: 'var(--coral)',
    marginBottom: 10,
  },
  h1: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(2rem, 4vw, 3rem)',
  },
  updatedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  draftBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--coral)',
    background: 'var(--coral-soft)',
    borderRadius: 999,
    padding: '3px 10px',
  },
  updated: {
    fontSize: 12,
    color: 'var(--muted)',
    margin: 0,
  },
  intro: {
    margin: '18px 0 26px',
    fontSize: 14,
    color: 'var(--muted)',
    maxWidth: 640,
  },
  section: {
    marginBottom: 16,
  },
  h2: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    marginBottom: 8,
  },
  body: {
    margin: 0,
    fontSize: 13.5,
    lineHeight: 1.65,
    color: 'var(--ink)',
  },
};

const sections = [
  {
    title: 'Using the platform',
    body: 'You need an account to take courses or hire through CebuUpskilling. Keep your login credentials confidential and make sure the information on your profile is accurate and up to date.',
  },
  {
    title: 'Courses and learner content',
    body: 'Course materials are provided for your personal learning. Do not redistribute them outside the platform. Your progress and assessment results belong to you and can be downloaded on request.',
  },
  {
    title: 'Employers and job postings',
    body: 'Employers are responsible for the accuracy of the jobs they post and for complying with Philippine labour law when hiring. Postings that are misleading, discriminatory or unrelated to genuine openings may be removed.',
  },
  {
    title: 'Acceptable use',
    body: 'Do not misuse the platform: no scraping, attempting to access other accounts, submitting fraudulent applications, or interfering with assessments. We may suspend accounts that break these rules.',
  },
  {
    title: 'Disclaimers and changes',
    body: 'The platform is provided as-is; we do not guarantee job placement outcomes. These terms may change as the product evolves, and significant updates will be announced in the app.',
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="view-enter" style={styles.page}>
      <div style={styles.inner}>
        <Link to="/" style={styles.back}>
          <ArrowLeft size={15} /> Back to CebuUpskilling
        </Link>
        <div style={styles.eyebrow}>Legal</div>
        <h1 style={styles.h1}>Terms of Service</h1>
        <div style={styles.updatedRow}>
          <span style={styles.draftBadge}>Draft for review</span>
          <p style={styles.updated}>Last updated: August 2026</p>
        </div>
        <p style={styles.intro}>
          The ground rules for using CebuUpskilling. This draft must be reviewed by counsel
          before publication.
        </p>
        {sections.map((section) => (
          <Panel key={section.title} style={styles.section}>
            <h2 style={styles.h2}>{section.title}</h2>
            <p style={styles.body}>{section.body}</p>
          </Panel>
        ))}
        <Panel style={{ ...styles.section, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Scale size={22} style={{ color: 'var(--teal)', flexShrink: 0 }} />
          <p style={styles.body}>
            See also our <Link to="/privacy">Privacy Notice</Link> for how your data is handled.
          </p>
        </Panel>
      </div>
      <Footer />
    </div>
  );
}
