import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
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
    title: 'What we collect',
    body: 'When you register we store your name, email address and role (learner or employer). As you use CebuUpskilling we also record your skills profile, course enrolments and progress, assessment results, and the jobs you post or apply to.',
  },
  {
    title: 'How we use your data',
    body: 'Your data is used to operate the platform: delivering courses, tracking progress, matching learners to relevant job postings, and letting employers review applications you submit. Aggregated, de-identified usage data helps us improve the product.',
  },
  {
    title: 'Cookies',
    body: 'Essential cookies keep you signed in and protect your session against misuse. Optional analytics cookies are only set after you accept them in the cookie banner. If you decline, non-essential cookies are not stored, and you can change your mind any time by clearing this site\u2019s browser storage.',
  },
  {
    title: 'Sharing and retention',
    body: 'We do not sell personal data. Your profile details are shared with an employer only when you apply to one of their postings. Data is retained while your account is active; deleting your account removes your personal data from the production system.',
  },
  {
    title: 'Your rights and contact',
    body: 'You may request access to, correction of, or deletion of your personal data at any time from your profile page or by contacting our support team. We aim to respond to all requests within 30 days.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="view-enter" style={styles.page}>
      <div style={styles.inner}>
        <Link to="/" style={styles.back}>
          <ArrowLeft size={15} /> Back to CebuUpskilling
        </Link>
        <div style={styles.eyebrow}>Legal</div>
        <h1 style={styles.h1}>Privacy Notice</h1>
        <div style={styles.updatedRow}>
          <span style={styles.draftBadge}>Draft for review</span>
          <p style={styles.updated}>Last updated: August 2026</p>
        </div>
        <p style={styles.intro}>
          This notice explains what data CebuUpskilling collects, how it is used, and the choices
          you have. It is a working draft and must be reviewed by counsel before publication.
        </p>
        {sections.map((section) => (
          <Panel key={section.title} style={styles.section}>
            <h2 style={styles.h2}>{section.title}</h2>
            <p style={styles.body}>{section.body}</p>
          </Panel>
        ))}
        <Panel style={{ ...styles.section, display: 'flex', gap: 12, alignItems: 'center' }}>
          <ShieldCheck size={22} style={{ color: 'var(--teal)', flexShrink: 0 }} />
          <p style={styles.body}>
            Questions about this notice? Reach us through the{' '}
            <Link to="/help">Help Center</Link>.
          </p>
        </Panel>
      </div>
      <Footer />
    </div>
  );
}
