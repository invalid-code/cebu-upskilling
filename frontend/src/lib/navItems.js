import {
  LayoutDashboard, Orbit, BriefcaseBusiness, BookOpenCheck, BookOpen,
  ClipboardList, ScanFace, BadgeCheck, CircleHelp,
  ChartBar, Inbox, PlusCircle, Building2, Library, LayoutGrid,
} from 'lucide-react';
import { isLearner, isRecruiter, isCourseProvider } from '../stores/authStore';

// Nav config mirrors the groups previously defined inline in Layout/Sidebar.jsx.
const learnerPathwayNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', short: 'Home' },
  { to: '/skills', icon: Orbit, label: 'Skill profile', short: 'Skills' },
  { to: '/jobs', icon: BriefcaseBusiness, label: 'Find work', short: 'Jobs' },
  { to: '/courses', icon: BookOpenCheck, label: 'Learn' },
  { to: '/applications', icon: ClipboardList, label: 'Applications', short: 'Apps' },
  { to: '/assessments', icon: ScanFace, label: 'Assessments', short: 'Tests' },
];

const learnerAccountNav = [
  { to: '/credentials', icon: BadgeCheck, label: 'Credentials' },
  { to: '/help', icon: CircleHelp, label: 'Help center', short: 'Help' },
];

const recruiterNav = [
  { to: '/business-dashboard', icon: ChartBar, label: 'Business dashboard', short: 'Dashboard' },
  { to: '/company-courses', icon: BookOpen, label: 'Course studio', short: 'Courses' },
  { to: '/post-job', icon: PlusCircle, label: 'Post a job', short: 'Post' },
  { to: '/job-applications', icon: Inbox, label: 'Applications', short: 'Apps' },
  { to: '/company-profile', icon: Building2, label: 'Company profile', short: 'Company' },
  { to: '/help', icon: CircleHelp, label: 'Help center', short: 'Help' },
];

const providerNav = [
  { to: '/provider-dashboard', icon: LayoutGrid, label: 'Provider dashboard', short: 'Dashboard' },
  { to: '/company-courses', icon: Library, label: 'Course studio', short: 'Courses' },
  { to: '/help', icon: CircleHelp, label: 'Help center', short: 'Help' },
];

const startsWithAny = (path, prefixes) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

const LEARNER_PREFIXES = [
  '/dashboard', '/skills', '/jobs', '/courses', '/applications', '/assessments', '/credentials',
];
const RECRUITER_PREFIXES = [
  '/business-dashboard', '/post-job', '/edit-job', '/job-applications', '/company-profile',
];
const PROVIDER_PREFIXES = ['/provider-dashboard'];
const STUDIO_PREFIXES = ['/company-courses'];
const SHARED_PREFIXES = ['/profile', '/help'];

/**
 * Whether the route guard for `path` lets `user` through (mirrors components/RoleRoute.jsx
 * and the route table in App.jsx).
 */
export function canAccessPath(user, path) {
  if (!user || typeof path !== 'string') return false;
  if (startsWithAny(path, SHARED_PREFIXES)) return true;
  if (startsWithAny(path, STUDIO_PREFIXES)) return isRecruiter(user) || isCourseProvider(user);
  if (startsWithAny(path, LEARNER_PREFIXES)) return isLearner(user);
  if (startsWithAny(path, RECRUITER_PREFIXES)) return isRecruiter(user);
  if (startsWithAny(path, PROVIDER_PREFIXES)) return isCourseProvider(user);
  return false;
}

/**
 * Role-aware navigation groups. Null or unknown role returns []; groups left
 * empty after guard filtering are omitted.
 * @returns {{ label: string, items: Array<{to: string, icon: any, label: string, short?: string}> }[]}
 */
export function navItemsFor(user) {
  if (!user) return [];

  let groups;
  if (isCourseProvider(user)) groups = [{ label: 'Provider studio', items: providerNav }];
  else if (isRecruiter(user)) groups = [{ label: 'Employer tools', items: recruiterNav }];
  else if (isLearner(user)) {
    groups = [
      { label: 'My pathway', items: learnerPathwayNav },
      { label: 'Account', items: learnerAccountNav },
    ];
  } else return [];

  return groups
    .map((g) => ({ ...g, items: g.items.filter((item) => canAccessPath(user, item.to)) }))
    .filter((g) => g.items.length > 0);
}
