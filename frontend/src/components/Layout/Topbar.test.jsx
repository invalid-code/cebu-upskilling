import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { useNotificationStore } from '../../stores/notificationStore';
import { useToastStore } from '../../stores/toastStore';
import Topbar from './Topbar';

function renderTopbar(path, user) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <Topbar />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Topbar', () => {
  beforeEach(() => {
    useNotificationStore.getState()._reset();
    useToastStore.getState()._reset();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows the learner crumb with the current route label', () => {
    renderTopbar('/skills', { firstName: 'Juan', role: 'Learner' });

    expect(screen.getByText('My pathway / Skill profile')).toBeInTheDocument();
  });

  it('shows the employer crumb for recruiters', () => {
    renderTopbar('/business-dashboard', { firstName: 'Maria', role: 'Recruiter' });

    expect(screen.getByText('Employer / Business dashboard')).toBeInTheDocument();
  });

  it('shows the provider crumb for CourseProviders', () => {
    renderTopbar('/provider-dashboard', { firstName: 'Ana', role: 'CourseProvider' });
    expect(screen.getByText('Provider / Provider dashboard')).toBeInTheDocument();
  });

  it('falls back to Page for unknown routes', () => {
    renderTopbar('/nowhere', { firstName: 'Juan', role: 'Learner' });

    expect(screen.getByText('My pathway / Page')).toBeInTheDocument();
  });

  it('renders the avatar initials', () => {
    renderTopbar('/', { firstName: 'Juan', lastName: 'Cruz', role: 'Learner' });

    expect(screen.getByRole('link', { name: /open profile/i })).toHaveTextContent('JC');
  });

  it('opens the notifications panel with an empty state', () => {
    renderTopbar('/', { firstName: 'Juan', role: 'Learner' });
    const bell = screen.getByRole('button', { name: 'Notifications' });
    expect(bell).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(bell);

    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('shows unread count on the bell and marks everything read when opened', () => {
    renderTopbar('/', { firstName: 'Juan', role: 'Learner' });
    act(() => {
      useToastStore.getState().showToast('Application sent', 'success');
      useToastStore.getState().showToast('Upload failed', 'error');
    });

    expect(screen.getByRole('button', { name: 'Notifications (2 unread)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications (2 unread)' }));

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: 'Notifications' });
    expect(within(panel).getByText('Application sent')).toBeInTheDocument();
    expect(within(panel).getByText('Upload failed')).toBeInTheDocument();
  });

  it('closes the panel on Escape and clears the feed', () => {
    renderTopbar('/', { firstName: 'Juan', role: 'Learner' });
    act(() => {
      useToastStore.getState().showToast('Saved', 'success');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Notifications (1 unread)' }));
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });
});
