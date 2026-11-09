import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Ellipsis } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navItemsFor } from '../../lib/navItems';
import styles from './MobileNav.module.css';

const MAX_ENTRIES = 5;

/**
 * Splits destinations into the bar entries and the overflow. With 5 or fewer
 * destinations all are shown; otherwise the first 4 plus a "More" entry.
 */
export function splitMobileItems(items) {
  if (items.length <= MAX_ENTRIES) return { visible: items, overflow: [] };
  return { visible: items.slice(0, MAX_ENTRIES - 1), overflow: items.slice(MAX_ENTRIES - 1) };
}

function linkClass({ isActive }) {
  return `${styles.link}${isActive ? ` ${styles.linkActive}` : ''}`;
}

export default function MobileNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const sheetRef = useRef(null);

  const items = navItemsFor(user).flatMap((g) => g.items);
  const { visible, overflow } = splitMobileItems(items);

  // Close the sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        moreRef.current?.focus();
      }
    };
    const onPointerDown = (e) => {
      if (sheetRef.current?.contains(e.target) || moreRef.current?.contains(e.target)) return;
      setMoreOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [moreOpen]);

  if (items.length === 0) return null;

  return (
    <nav className={styles.nav} aria-label="Primary">
      {visible.map(({ to, icon: Icon, label, short }) => (
        <NavLink key={to} to={to} end={to === '/dashboard'} className={linkClass} aria-label={label}>
          <Icon size={18} aria-hidden="true" />
          <span className={styles.text}>{short || label}</span>
        </NavLink>
      ))}

      {overflow.length > 0 && (
        <>
          <button
            ref={moreRef}
            type="button"
            className={styles.link}
            aria-expanded={moreOpen}
            aria-controls="mobile-nav-more"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <Ellipsis size={18} aria-hidden="true" />
            <span className={styles.text}>More</span>
          </button>
          {moreOpen && (
            <div id="mobile-nav-more" ref={sheetRef} className={styles.sheet} role="group" aria-label="More destinations">
              {overflow.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} className={linkClass}>
                  <Icon size={18} aria-hidden="true" />
                  <span className={styles.text}>{label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </>
      )}
    </nav>
  );
}
