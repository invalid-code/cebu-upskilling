import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Orbit, BriefcaseBusiness, BookOpenCheck, ClipboardList, ChartBar, CircleHelp } from 'lucide-react';
import { useAuth, isRecruiter } from '../../context/AuthContext';

const learnerLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/skills', icon: Orbit, label: 'Skills' },
  { to: '/jobs', icon: BriefcaseBusiness, label: 'Jobs' },
  { to: '/courses', icon: BookOpenCheck, label: 'Learn' },
  { to: '/applications', icon: ClipboardList, label: 'Apps' },
];

const recruiterLinks = [
  { to: '/business-dashboard', icon: ChartBar, label: 'Dashboard' },
  { to: '/help', icon: CircleHelp, label: 'Help' },
];

const styles = {
  nav: {
    display: 'flex',
    position: 'fixed',
    bottom: 12,
    left: 12,
    right: 12,
    background: 'var(--teal)',
    zIndex: 5,
    borderRadius: 14,
    padding: 7,
    justifyContent: 'space-around',
    boxShadow: 'var(--shadow)',
  },
  link: {
    background: 'transparent',
    color: 'var(--surface)',
    fontSize: 10,
    padding: 7,
    display: 'grid',
    gap: 3,
    placeItems: 'center',
    textDecoration: 'none',
    borderRadius: 10,
  },
};

export default function MobileNav() {
  const { user } = useAuth();
  const links = isRecruiter(user) ? recruiterLinks : learnerLinks;

  return (
    <nav className="mobile-nav" style={styles.nav}>
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            ...styles.link,
            background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
          })}
        >
          <Icon size={17} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}