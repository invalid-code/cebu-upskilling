import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CookieConsentProvider, useCookieConsent } from './CookieConsentContext';

function ConsentProbe() {
  const { consent, accept, decline } = useCookieConsent();
  return (
    <div>
      <span>consent:{consent ?? 'none'}</span>
      <button onClick={accept}>accept</button>
      <button onClick={decline}>decline</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <CookieConsentProvider>
      <ConsentProbe />
    </CookieConsentProvider>,
  );
}

describe('CookieConsentContext', () => {
  beforeEach(() => localStorage.clear());

  it('starts with no consent when nothing is stored', () => {
    renderProbe();

    expect(screen.getByText('consent:none')).toBeInTheDocument();
  });

  it('stores accepted when accepted', () => {
    renderProbe();

    fireEvent.click(screen.getByRole('button', { name: 'accept' }));

    expect(screen.getByText('consent:accepted')).toBeInTheDocument();
    expect(localStorage.getItem('cebu-cookie-consent')).toBe('accepted');
  });

  it('stores declined when declined', () => {
    renderProbe();

    fireEvent.click(screen.getByRole('button', { name: 'decline' }));

    expect(screen.getByText('consent:declined')).toBeInTheDocument();
    expect(localStorage.getItem('cebu-cookie-consent')).toBe('declined');
  });

  it('restores a previous choice from storage', () => {
    localStorage.setItem('cebu-cookie-consent', 'accepted');

    renderProbe();

    expect(screen.getByText('consent:accepted')).toBeInTheDocument();
  });
});
