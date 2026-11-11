import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { useOfflineStore } from '../../stores/offlineStore';
import AppShell from './AppShell';

function renderShell() {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Juan', lastName: 'Cruz', role: 'Learner' }));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<input aria-label="draft" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    useOfflineStore.setState({ offline: false, failed: false, retrying: false });
  });

  it('renders the skip link as the first focusable element', () => {
    const { container } = renderShell();
    const first = container.querySelector('a, button, input, [tabindex="0"]');
    expect(first).toHaveTextContent('Skip to content');
    expect(first).toHaveAttribute('href', '#main-content');
  });

  it('moves focus to main#main-content when the skip link is activated', () => {
    renderShell();
    fireEvent.click(screen.getByText('Skip to content'));
    expect(document.activeElement).toBe(document.querySelector('main#main-content'));
  });

  it('mounts the OfflineBanner and shows it while offline', () => {
    renderShell();
    expect(screen.queryByText(/you.re offline/i)).not.toBeInTheDocument();
    act(() => useOfflineStore.setState({ offline: true }));
    expect(screen.getByText(/you.re offline/i)).toBeInTheDocument();
  });

  it('renders rail navigation and bottom navigation from the same config', () => {
    renderShell();
    expect(screen.getByRole('navigation', { name: 'My pathway' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });
});
