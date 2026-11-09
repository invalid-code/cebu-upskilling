import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, CheckCircle2, AlertCircle, Info, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { useAuth, isRecruiter, isCourseProvider } from '../../context/AuthContext';
import { useNotificationStore, unreadCount } from '../../stores/notificationStore';

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
  '/provider-dashboard': 'Provider dashboard',
  '/post-job': 'Post a job',
  '/job-applications': 'Applications',
  '/company-profile': 'Company profile',
  '/company-courses': 'Courses',
  '/login': 'Login',
  '/register': 'Register',
};

function getLabel(pathname) {
  if (routeLabels[pathname]) return routeLabels[pathname];
  if (pathname.startsWith('/jobs/')) return 'Job detail';
  if (pathname.startsWith('/courses/')) return 'Learn';
  if (pathname.startsWith('/credentials/')) return 'Certificate';
  if (pathname.startsWith('/edit-job/')) return 'Edit job';
  return 'Page';
}

function timeAgo(at) {
  const seconds = Math.floor((Date.now() - at) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const variantMeta = {
  success: { Icon: CheckCircle2, background: 'var(--good-soft)', color: 'var(--good)' },
  error: { Icon: AlertCircle, background: 'var(--danger-soft)', color: 'var(--danger)' },
  info: { Icon: Info, background: 'var(--teal-soft)', color: 'var(--teal)' },
};

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
  bellWrap: {
    position: 'relative',
    display: 'flex',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'transparent',
    color: 'var(--muted)',
    display: 'grid',
    placeItems: 'center',
    border: 0,
    cursor: 'pointer',
  },
  iconBtnOpen: {
    background: 'var(--surface2)',
    color: 'var(--teal)',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    padding: '0 4px',
    borderRadius: 999,
    background: 'var(--coral)',
    color: 'var(--on-accent)',
    fontSize: 10,
    fontWeight: 800,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
  },
  panel: {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    right: 0,
    width: 340,
    maxWidth: 'calc(100vw - 32px)',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 14,
    boxShadow: 'var(--shadow)',
    zIndex: 6,
    outline: 'none',
  },
  panelHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '13px 15px',
    borderBottom: '1px solid var(--line)',
  },
  panelTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    fontWeight: 700,
  },
  clearBtn: {
    background: 'transparent',
    border: 0,
    color: 'var(--teal)',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    maxHeight: 340,
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    gap: 11,
    alignItems: 'flex-start',
    padding: '12px 15px',
    borderBottom: '1px solid var(--line)',
  },
  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  itemBody: {
    display: 'grid',
    gap: 3,
    minWidth: 0,
  },
  itemMsg: {
    fontSize: 13,
    color: 'var(--ink)',
    lineHeight: 1.4,
    overflowWrap: 'anywhere',
  },
  itemTime: {
    fontSize: 11,
    color: 'var(--muted)',
  },
  empty: {
    margin: 0,
    padding: '26px 15px',
    fontSize: 13,
    color: 'var(--muted)',
    textAlign: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--surface2)',
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
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);
  const panelRef = useRef(null);

  const items = useNotificationStore((s) => s.items);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clear = useNotificationStore((s) => s.clear);
  const unread = unreadCount(items);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) markAllRead();
  };

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        bellRef.current?.focus();
      }
    };
    const onPointerDown = (e) => {
      if (panelRef.current?.contains(e.target) || bellRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const label = getLabel(location.pathname);
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
    : 'U';

  return (
    <header className="topbar" style={styles.topbar}>
      <div className="crumb" style={styles.crumb}>
        {isCourseProvider(user) ? 'Provider' : isRecruiter(user) ? 'Employer' : 'My pathway'} / {label}
      </div>
      <div className="top-actions" style={styles.actions}>
        <div style={styles.bellWrap}>
          <button
            ref={bellRef}
            className="icon-btn"
            style={{ ...styles.iconBtn, ...(open ? styles.iconBtnOpen : {}) }}
            aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
            aria-expanded={open}
            aria-controls="notifications-panel"
            onClick={toggle}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span style={styles.badge} aria-hidden="true">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <section
              id="notifications-panel"
              ref={panelRef}
              tabIndex={-1}
              aria-label="Notifications"
              style={styles.panel}
            >
              <div style={styles.panelHead}>
                <span style={styles.panelTitle}>Notifications</span>
                {items.length > 0 && (
                  <button type="button" style={styles.clearBtn} onClick={clear}>
                    Clear all
                  </button>
                )}
              </div>
              {items.length === 0 ? (
                <p style={styles.empty}>No notifications yet</p>
              ) : (
                <ul style={styles.list}>
                  {items.map((item) => {
                    const { Icon, background, color } = variantMeta[item.variant] || variantMeta.info;
                    return (
                      <li key={item.id} style={styles.item}>
                        <span style={{ ...styles.itemIcon, background, color }} aria-hidden="true">
                          <Icon size={15} />
                        </span>
                        <span style={styles.itemBody}>
                          <span style={styles.itemMsg}>{item.message}</span>
                          <span style={styles.itemTime}>{timeAgo(item.at)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        <button
          className="icon-btn"
          style={{ ...styles.iconBtn, marginRight: 8 }}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Link to="/profile" style={styles.avatar} aria-label={`${initials}, open profile`}>
          {initials}
        </Link>
      </div>
    </header>
  );
}
