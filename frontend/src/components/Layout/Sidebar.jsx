import { Link, NavLink } from 'react-router-dom';
import { useAuth, isRecruiter } from '../../context/AuthContext';
import {
  LayoutDashboard, Orbit, BriefcaseBusiness, BookOpenCheck, BookOpen,
  ClipboardList, ScanFace, BadgeCheck, CircleHelp, LogOut,
  ChartBar, Inbox, PlusCircle, Building2,
} from 'lucide-react';

const learnerPathwayNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/skills', icon: Orbit, label: 'Skill profile' },
  { to: '/jobs', icon: BriefcaseBusiness, label: 'Find work' },
  { to: '/courses', icon: BookOpenCheck, label: 'Learn' },
  { to: '/applications', icon: ClipboardList, label: 'Applications' },
  { to: '/assessments', icon: ScanFace, label: 'Assessments' },
];

const learnerAccountNav = [
  { to: '/credentials', icon: BadgeCheck, label: 'Credentials' },
  { to: '/help', icon: CircleHelp, label: 'Help center' },
];

const recruiterNav = [
  { to: '/business-dashboard', icon: ChartBar, label: 'Business dashboard' },
  { to: '/company-courses', icon: BookOpen, label: 'Course studio' },
  { to: '/post-job', icon: PlusCircle, label: 'Post a job' },
  { to: '/job-applications', icon: Inbox, label: 'Applications' },
  { to: '/company-profile', icon: Building2, label: 'Company profile' },
  { to: '/help', icon: CircleHelp, label: 'Help center' },
];

const styles = {
  rail: {
    background: 'var(--teal)',
    color: 'rgba(245, 250, 248, 0.96)',
    padding: '24px 16px',
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  brand: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    padding: '0 8px 34px',
  },
  mark: {
    width: 35,
    height: 35,
    borderRadius: 11,
    background: 'var(--coral)',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--surface)',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
  },
  brandName: {
    display: 'block',
    fontWeight: 700,
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  brandSub: {
    display: 'block',
    fontSize: 11,
    color: 'rgba(200, 225, 218, 0.83)',
  },
  navLabel: {
    fontSize: 10,
    letterSpacing: '0.13em',
    textTransform: 'uppercase',
    color: 'rgba(200, 225, 218, 0.76)',
    margin: '14px 10px 7px',
  },
  nav: {
    display: 'grid',
    gap: 4,
  },
  navLink: {
    color: 'rgba(225, 240, 235, 0.88)',
    padding: 10,
    borderRadius: 10,
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  },
  account: {
    marginTop: 'auto',
    borderTop: '1px solid rgba(230, 245, 238, 0.16)',
    padding: '16px 8px 0',
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 33,
    height: 33,
    borderRadius: '50%',
    background: 'var(--sand)',
    color: 'var(--teal)',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: 12,
    flexShrink: 0,
  },
  userName: {
    fontWeight: 700,
    fontSize: 12,
  },
   userRole: {
     display: 'block',
     color: 'rgba(200, 225, 218, 0.80)',
     fontSize: 11,
   },
   logoutBtn: {
     background: 'transparent',
     border: 0,
     color: 'rgba(200, 225, 218, 0.60)',
     cursor: 'pointer',
     padding: 4,
     borderRadius: 8,
     display: 'grid',
     placeItems: 'center',
     marginLeft: 'auto',
   },
 };

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      // Only dashboard uses exact matching; recruiter routes intentionally stay active for nested paths
      end={to === '/dashboard'}
      style={({ isActive }) => ({
        ...styles.navLink,
        background: isActive ? 'rgba(30, 100, 80, 0.48)' : 'transparent',
        color: isActive ? 'var(--surface)' : 'rgba(225, 240, 235, 0.88)',
      })}
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
    : 'U';

  const recruiter = isRecruiter(user);

  return (
    <aside className="rail" style={styles.rail}>
      <div style={styles.brand}>
        <div style={styles.mark}>CU</div>
        <div>
          <strong style={styles.brandName}>Cebu Upskilling</strong>
          <span style={styles.brandSub}>Career Pathway Application</span>
        </div>
      </div>

      {recruiter ? (
        <>
          <div style={styles.navLabel}>Employer tools</div>
          <nav style={styles.nav}>
            {recruiterNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </>
      ) : (
        <>
          <div style={styles.navLabel}>My pathway</div>
          <nav style={styles.nav}>
            {learnerPathwayNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <div style={styles.navLabel}>Account</div>
          <nav style={styles.nav}>
            {learnerAccountNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </>
      )}

       <div style={styles.account}>
         <Link to="/profile" style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'inherit', textDecoration: 'none' }} aria-label="Open profile">
           <div style={styles.avatar}>{initials}</div>
           <div>
             <strong style={styles.userName}>
               {user?.firstName || 'User'}
             </strong>
             <small style={styles.userRole}>{user?.role || 'User'}</small>
           </div>
         </Link>
         <button
           style={styles.logoutBtn}
           onClick={() => logout()}
           aria-label="Sign out"
         >
           <LogOut size={16} />
         </button>
       </div>
    </aside>
  );
}
