import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CookieBanner from './CookieBanner';
import { CookieConsentProvider } from '../../context/CookieConsentContext';

function renderBanner() {
  return render(
    <MemoryRouter>
      <CookieConsentProvider>
        <CookieBanner />
      </CookieConsentProvider>
    </MemoryRouter>,
  );
}

describe('CookieBanner', () => {
  beforeEach(() => localStorage.clear());

  it('shows the notice with a privacy link when no choice has been made', () => {
    renderBanner();

    expect(screen.getByRole('region', { name: 'Cookie notice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('hides after accepting', () => {
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(localStorage.getItem('cebu-cookie-consent')).toBe('accepted');
    expect(screen.queryByRole('region', { name: 'Cookie notice' })).not.toBeInTheDocument();
  });

  it('hides after declining', () => {
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(localStorage.getItem('cebu-cookie-consent')).toBe('declined');
    expect(screen.queryByRole('region', { name: 'Cookie notice' })).not.toBeInTheDocument();
  });

  it('stays hidden when consent was already recorded', () => {
    localStorage.setItem('cebu-cookie-consent', 'accepted');

    renderBanner();

    expect(screen.queryByRole('region', { name: 'Cookie notice' })).not.toBeInTheDocument();
  });

  it('renders as a compact box anchored to the corner, not a full-width span', () => {
    renderBanner();

    const banner = screen.getByRole('region', { name: 'Cookie notice' });
    expect(banner).toHaveClass('cookie-banner');
    expect(banner).toHaveStyle({
      position: 'fixed',
      right: '22px',
      bottom: '22px',
      left: 'auto',
      width: '380px',
      display: 'flex',
      gap: '14px',
      background: 'var(--surface)',
    });
    // jsdom normalizes some properties — check via style property directly
    expect(banner.style.flexDirection).toBe('column');
    expect(banner.style.maxWidth).toBe('calc(100vw - 32px)');
    expect(banner.style.borderRadius).toBe('var(--radius-lg)');
    // must not span the screen (previous left:22 + right:22 full-width)
    expect(banner.style.left).not.toBe('22px');
    expect(banner.style.right).toBe('22px');
  });

  it('renders the Cookies heading with the icon header', () => {
    renderBanner();

    expect(screen.getByRole('heading', { name: 'Cookies' })).toBeInTheDocument();
    // icon container is hidden from accessibility but should be in DOM
    const banner = screen.getByRole('region', { name: 'Cookie notice' });
    expect(banner.innerHTML).toContain('svg');
  });

  it('uses muted description and teal link in the box layout', () => {
    renderBanner();

    const text = screen.getByText(/We use essential cookies/);
    expect(text).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy');
  });

  it('aligns actions to the end of the box', () => {
    renderBanner();

    const actions = screen.getByRole('button', { name: 'Accept' }).parentElement;
    expect(actions).toHaveStyle({ display: 'flex', justifyContent: 'flex-end' });
  });
});
