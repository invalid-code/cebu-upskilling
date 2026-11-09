import { Link, NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navItemsFor } from '../../lib/navItems';
import styles from './Sidebar.module.css';

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      title={label}
      // Only dashboard uses exact matching; other routes stay active for nested paths
      end={to === '/dashboard'}
      className={({ isActive }) => `${styles.link}${isActive ? ` ${styles.linkActive}` : ''}`}
    >
      <Icon size={18} className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
    : 'U';
  const groups = navItemsFor(user);

  return (
    <aside className={styles.rail} aria-label="Sidebar">
      <div className={styles.brand}>
        <div className={styles.mark}>CU</div>
        <div className={styles.brandText}>
          <strong className={styles.brandName}>Cebu Upskilling</strong>
          <span className={styles.brandSub}>Career Pathway Application</span>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.label} className={styles.group}>
          <div className={styles.groupLabel}>{group.label}</div>
          <nav className={styles.nav} aria-label={group.label}>
            {group.items.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </div>
      ))}

      <div className={styles.account}>
        <Link to="/profile" className={styles.accountLink} title="Open profile">
          <div className={styles.avatar} aria-hidden="true">{initials}</div>
          <div className={styles.userText}>
            <strong className={styles.userName}>{user?.firstName || 'User'}</strong>
            <small className={styles.userRole}>{user?.role || 'User'}</small>
          </div>
        </Link>
        <button
          type="button"
          className={styles.logout}
          onClick={() => logout()}
          aria-label="Sign out"
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
