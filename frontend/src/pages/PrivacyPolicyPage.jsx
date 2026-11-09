import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import ReadingTemplate from '../components/shared/ReadingTemplate';

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
    <ReadingTemplate
      title="Privacy Notice"
      intro="This notice explains what data CebuUpskilling collects, how it is used, and the choices you have. It is a working draft and must be reviewed by counsel before publication."
      sections={sections}
      note={{
        icon: ShieldCheck,
        children: (
          <>
            Questions about this notice? Reach us through the <Link to="/help">Help Center</Link>.
          </>
        ),
      }}
    />
  );
}
