import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import ReadingTemplate from '../components/shared/ReadingTemplate';

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
    <ReadingTemplate
      title="Terms of Service"
      intro="The ground rules for using CebuUpskilling. This draft must be reviewed by counsel before publication."
      sections={sections}
      note={{
        icon: Scale,
        children: (
          <>
            See also our <Link to="/privacy">Privacy Notice</Link> for how your data is handled.
          </>
        ),
      }}
    />
  );
}
