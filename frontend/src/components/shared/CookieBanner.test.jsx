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
});
