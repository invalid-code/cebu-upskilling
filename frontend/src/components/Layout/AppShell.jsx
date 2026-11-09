import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import Footer from './Footer';
import OfflineBanner from '../shared/OfflineBanner';
import styles from './AppShell.module.css';

function focusMain(event) {
  const main = document.getElementById('main-content');
  if (!main) return;
  event.preventDefault();
  // Synchronous, so well inside the 100ms budget.
  main.focus();
  main.scrollIntoView?.({ block: 'start' });
}

/**
 * Authenticated layout. Layout switches (rail / icon rail / bottom nav) are CSS
 * media queries only; the tree is never remounted on resize, so route and form
 * state are preserved and the change applies on the next frame (<300ms).
 */
export default function AppShell() {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main-content" onClick={focusMain}>Skip to content</a>
      <Sidebar />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Topbar />
        <OfflineBanner />
        <div className={styles.content}>
          <Outlet />
        </div>
        <Footer />
      </main>
      <MobileNav />
    </div>
  );
}
