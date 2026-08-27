import { Link, useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import { useAuth, isRecruiter } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const routeLabels = {
  '/dashboard': 'Overview',
  '/skills': 'Skill profile',
  '/jobs': 'Find work',
  '/courses': 'Learn',
  '/applications': 'Applications',
  '/assessments': 'Assessments',
  '/credentials': 'Credentials',
  '/help': 'Help center',
  '/profile': 'Profile',
  '/business-dashboard': 'Business dashboard',
  '/post-job': 'Post a job',
  '/job-applications': 'Applications',
  '/login': 'Login',
  '/register': 'Register',
};

function getLabel(pathname) {
  if (routeLabels[pathname]) return routeLabels[pathname];
  if (pathname.startsWith('/jobs/')) return 'Job detail';
  if (pathname.startsWith('/courses/')) return 'Learn';
  if (pathname.startsWith('/edit-job/')) return 'Edit job';
  return 'Page';
}

const styles = {
  topbar: {
    height: 70,
    borderBottom: '1px solid var(--line)',
    background: 'var(--surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 clamp(20px, 4vw, 56px)',
    position: 'sticky',
    top: 0,
    zIndex: 4,
  },
  crumb: {
    fontSize: 13,
    color: 'var(--muted)',
  },
  actions: {
    display: 'flex',
    gap: 9,
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'transparent',
    color: 'var(--muted)',
    display: 'grid',
    placeItems: 'center',
    border: 0,
    cursor: 'pointer',
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
    border: 0,
    cursor: 'pointer',
  },
};

export default function Topbar() {
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const label = getLabel(location.pathname);
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
    : 'U';

  return (
    <header className="topbar" style={styles.topbar}>
      <div className="crumb" style={styles.crumb}>
        {isRecruiter(user) ? 'Employer' : 'My pathway'} / {label}
      </div>
      <div className="top-actions" style={styles.actions}>
        <button
          className="icon-btn"
          style={styles.iconBtn}
          aria-label="Search"
          onClick={() => showToast('Search coming soon')}
        >
          <Search size={18} />
        </button>
        <button
          className="icon-btn"
          style={styles.iconBtn}
          aria-label="Notifications"
          onClick={() => showToast('No new notifications')}
        >
          <Bell size={18} />
        </button>
        <Link to="/profile" style={styles.avatar} aria-label="Open profile">
          {initials}
        </Link>
      </div>
    </header>
  );
}
