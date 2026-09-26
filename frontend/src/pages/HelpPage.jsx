import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import { WifiOff, ShieldCheck, MessageCircleQuestion } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { eyebrow, headingRow, pageSubtitle, pageTitle } from '../styles/shared';

const styles = {
  heading: { ...headingRow },
  eyebrow: { ...eyebrow },
  h1: { ...pageTitle },
  subtitle: { ...pageSubtitle },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
};

const faqs = [
  {
    icon: WifiOff,
    iconColor: 'var(--coral)',
    title: 'Connection dropped?',
    desc: 'Your low-risk progress saves locally and syncs when you reconnect.',
  },
  {
    icon: ShieldCheck,
    iconColor: 'var(--teal2)',
    title: 'Assessment privacy',
    desc: 'Proctoring permissions are requested before the timer starts, never silently.',
  },
  {
    icon: MessageCircleQuestion,
    iconColor: 'var(--coral)',
    title: 'Still need help?',
    desc: 'Tell us what blocked you and we will point to the next action.',
    hasButton: true,
  },
];

export default function HelpPage() {
  const { showToast } = useToast();

  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>You are not stuck</div>
          <h1 style={styles.h1}>Help center</h1>
          <p style={styles.subtitle}>
            Clear answers for the moments that interrupt your path.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {faqs.map((faq) => (
          <Panel key={faq.title}>
            <faq.icon size={24} style={{ color: faq.iconColor }} />
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", marginTop: 12 }}>{faq.title}</h3>
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>{faq.desc}</p>
            {faq.hasButton && (
              <Button variant="secondary" style={{ marginTop: 12 }} onClick={() => showToast('Support request started — our team will reply within 24 hours', 'success')}>
                Contact support
              </Button>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
