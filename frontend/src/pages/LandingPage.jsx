import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, ArrowRight } from 'lucide-react';
import { useAuth, isRecruiter } from '../context/AuthContext';
import { useThemeStore } from '../stores/themeStore';
import { fetchPublicStats } from '../api/publicStats';
import WaterCanvas from '../components/water/WaterCanvas';
import WaveDivider from '../components/water/WaveDivider';
import styles from './LandingPage.module.css';

const STEPS = [
  {
    title: 'Build your skill profile',
    body: 'Upload your resume as a PDF or DOCX and review the skills we read from it, or add them by hand. Skills you prove through an assessment are marked verified; the rest stay marked declared.',
  },
  {
    title: 'Pick a job and see the gap',
    body: 'Open any Cebu job post and see your match, the skills the employer asks for, and exactly which ones you are missing.',
  },
  {
    title: 'Close the gap with a course',
    body: 'Enroll in a course aimed at a missing skill. Your progress is saved lesson by lesson, so you pick up where you stopped.',
  },
  {
    title: 'Prove it',
    body: 'Take a proctored assessment and earn a certificate with a serial number. Anyone can check that number without an account.',
  },
];

const AUDIENCES = [
  {
    id: 'learners',
    name: 'Learners',
    body: 'Fresh graduates, career shifters and working professionals in Cebu who want to know what a job really requires before they apply.',
    action: 'Create a learner account',
  },
  {
    id: 'employers',
    name: 'Employers',
    body: 'Post a job with the skills it needs, then review applicants ranked by how well their verified skills match, instead of reading every resume top to bottom.',
    action: 'Register your company',
  },
  {
    id: 'providers',
    name: 'Course providers',
    body: 'Publish your curriculum as structured lessons, keep drafts private until they are ready, and issue certificates learners can show to employers.',
    action: 'Register as a provider',
  },
];

function useLandingStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicStats({ signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setStats(result);
    });
    return () => controller.abort();
  }, []);

  return stats;
}

export default function LandingPage() {
  const { user } = useAuth();
  const { isDark, toggle } = useThemeStore();
  const stats = useLandingStats();
  const dashboardPath = isRecruiter(user) ? '/business-dashboard' : '/dashboard';

  // `tone` doubles as the section background and the colour of the wave drawn above it.
  const sections = [
    {
      key: 'hero',
      tone: 'sea',
      render: () => (
        <section className={styles.hero} aria-labelledby="hero-title">
          <WaterCanvas className={styles.heroWater} intensity={0.55} interactive />
          <div className={styles.heroScrim} aria-hidden="true" />
          <div className={`${styles.shell} ${styles.heroInner}`}>
            <p className={styles.eyebrow}>Career pathways for Cebu</p>
            <h1 id="hero-title" className={styles.heroTitle}>
              Know which skills stand between you and the job you want.
            </h1>
            <p className={styles.heroLede}>
              Cebu Upskilling compares your skills with a real job post in Cebu, shows the gaps, and points you to the
              courses and assessments that close them.
            </p>
            <div className={styles.heroActions}>
              {user ? (
                <Link className={styles.btnCta} to={dashboardPath}>
                  Go to your dashboard <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link className={styles.btnCta} to="/register">
                    Create a free account <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <a className={styles.btnOutline} href="#how">
                    See how it works
                  </a>
                </>
              )}
            </div>
          </div>
        </section>
      ),
    },
    ...(stats
      ? [
          {
            key: 'stats',
            tone: 'surface',
            render: () => (
              <section className={`${styles.section} ${styles.surface}`} aria-labelledby="stats-title">
                <div className={styles.shell}>
                  <h2 id="stats-title" className={styles.h2}>Open on the platform right now</h2>
                  <dl className={styles.stats}>
                    <div className={styles.stat}>
                      <dt>Cebu jobs</dt>
                      <dd data-testid="stat-jobs">{String(stats.jobCount)}</dd>
                    </div>
                    <div className={styles.stat}>
                      <dt>Cebu courses</dt>
                      <dd data-testid="stat-courses">{String(stats.courseCount)}</dd>
                    </div>
                  </dl>
                </div>
              </section>
            ),
          },
        ]
      : []),
    {
      key: 'how',
      tone: 'soft',
      render: () => (
        <section id="how" className={`${styles.section} ${styles.soft}`} aria-labelledby="how-title">
          <div className={styles.shell}>
            <p className={styles.eyebrowDark}>How it works</p>
            <h2 id="how-title" className={styles.h2}>From a job post to a verified skill, in four steps.</h2>
            <ol className={styles.steps}>
              {STEPS.map((step, i) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepNo} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className={styles.h3}>{step.title}</h3>
                    <p className={styles.body}>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ),
    },
    {
      key: 'audiences',
      tone: 'surface',
      render: () => (
        <section id="who" className={`${styles.section} ${styles.surface}`} aria-labelledby="who-title">
          <div className={styles.shell}>
            <p className={styles.eyebrowDark}>Who it is for</p>
            <h2 id="who-title" className={styles.h2}>One platform, three ways in.</h2>
            <ul className={styles.ledger}>
              {AUDIENCES.map((a) => (
                <li key={a.id} className={styles.ledgerRow}>
                  <h3 className={styles.h3}>{a.name}</h3>
                  <p className={styles.body}>{a.body}</p>
                  {!user && (
                    <Link className={styles.textLink} to="/register">
                      {a.action} <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ),
    },
    {
      key: 'proof',
      tone: 'soft',
      render: () => (
        <section id="about" className={`${styles.section} ${styles.soft}`} aria-labelledby="about-title">
          <div className={`${styles.shell} ${styles.proof}`}>
            <div>
              <p className={styles.eyebrowDark}>Built in Cebu</p>
              <h2 id="about-title" className={styles.h2}>Second place at Cebu SolutionsFest 2026.</h2>
              <p className={styles.body}>
                SolutionsFest was an open-innovation challenge convened by the Cebu Chamber of Commerce and Industry and
                hosted at Cebu Institute of Technology &ndash; University. Cebu Upskilling was recognised for linking
                education to employment by matching skills to what local employers ask for.
              </p>
              <p className={styles.note}>
                The organisers and hosts listed above ran the event. They have not funded or endorsed Cebu Upskilling,
                and there is no commercial partnership with any of them.
              </p>
            </div>
            <figure className={styles.figure}>
              <img
                src="/images/TeamMembers.jpg"
                alt="The four-person Cebu Upskilling team standing together at the CBM 2026 Technology and Innovation Forum in Cebu City."
                loading="lazy"
              />
              <figcaption>The team at the CBM 2026 Technology &amp; Innovation Forum, Cebu City.</figcaption>
            </figure>
          </div>
        </section>
      ),
    },
    {
      key: 'cta',
      tone: 'primary',
      render: () => (
        <section className={`${styles.section} ${styles.primary}`} aria-labelledby="cta-title">
          <div className={styles.shell}>
            <h2 id="cta-title" className={styles.h2OnPrimary}>
              {user ? 'Pick up where you left off.' : 'Start with the job you want.'}
            </h2>
            <p className={styles.bodyOnPrimary}>
              {user
                ? 'Your skill gaps, courses and applications are waiting in your dashboard.'
                : 'Create an account, add your skills, and see your first gap list in a few minutes.'}
            </p>
            <div className={styles.heroActions}>
              {user ? (
                <Link className={styles.btnInverse} to={dashboardPath}>Go to your dashboard</Link>
              ) : (
                <>
                  <Link className={styles.btnInverse} to="/register">Create a free account</Link>
                  <Link className={styles.btnOutline} to="/login">Log in</Link>
                </>
              )}
            </div>
          </div>
        </section>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className={styles.header}>
        <div className={`${styles.shell} ${styles.headerInner}`}>
          <a className={styles.brand} href="#main-content" aria-label="Cebu Upskilling, top of page">
            <img src="/images/CropLogo-removebg-preview.png" alt="" width="36" height="36" />
            <span>Cebu Upskilling</span>
          </a>
          <nav className={styles.nav} aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#who">Who it is for</a>
            <a href="#about">About</a>
          </nav>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            {user ? (
              <Link className={styles.headerLink} to={dashboardPath}>Dashboard</Link>
            ) : (
              <>
                <Link className={styles.headerLink} to="/login">Log in</Link>
                <Link className={styles.headerCta} to="/register">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className={styles.main}>
        {sections.map((section, i) => (
          <div key={section.key} className={styles.block}>
            {i > 0 && (
              <div className={`${styles.dividerWrap} ${styles[`from_${sections[i - 1].tone}`]}`}>
                <WaveDivider tone={section.tone} />
              </div>
            )}
            {section.render()}
          </div>
        ))}
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.shell} ${styles.footerInner}`}>
          <span>Cebu Upskilling &middot; Cebu City, Philippines</span>
          <nav aria-label="Legal">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
