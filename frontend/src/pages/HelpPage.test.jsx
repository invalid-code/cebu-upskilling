import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import HelpPage from './HelpPage';

function renderHelp() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <HelpPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('HelpPage', () => {
  it('renders the help page heading', () => {
    renderHelp();
    expect(screen.getByRole('heading', { name: 'Help center' })).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderHelp();
    expect(screen.getByText('Clear answers for the moments that interrupt your path.')).toBeInTheDocument();
  });

  it('renders three FAQ panels', () => {
    renderHelp();
    expect(screen.getByText('Connection dropped?')).toBeInTheDocument();
    expect(screen.getByText('Assessment privacy')).toBeInTheDocument();
    expect(screen.getByText('Still need help?')).toBeInTheDocument();
  });

  it('displays first FAQ about connection', () => {
    renderHelp();
    expect(screen.getByText('Connection dropped?')).toBeInTheDocument();
    expect(screen.getByText('Your low-risk progress saves locally and syncs when you reconnect.')).toBeInTheDocument();
  });

  it('displays second FAQ about assessment privacy', () => {
    renderHelp();
    expect(screen.getByText('Assessment privacy')).toBeInTheDocument();
    expect(screen.getByText('Proctoring permissions are requested before the timer starts, never silently.')).toBeInTheDocument();
  });

  it('displays third FAQ about support with button', () => {
    renderHelp();
    expect(screen.getByText('Still need help?')).toBeInTheDocument();
    expect(screen.getByText('Tell us what blocked you and we will point to the next action.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contact support' })).toBeInTheDocument();
  });

  it('filters entries by question or answer, case-insensitively', () => {
    renderHelp();
    const input = screen.getByRole('searchbox', { name: /search help/i });
    fireEvent.change(input, { target: { value: 'PROCTORING' } });
    expect(screen.getByText('Assessment privacy')).toBeInTheDocument();
    expect(screen.queryByText('Connection dropped?')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'dropped' } });
    expect(screen.getByText('Connection dropped?')).toBeInTheDocument();
    expect(screen.queryByText('Assessment privacy')).not.toBeInTheDocument();
  });

  it('shows a no-results message keeping the query, and clearing restores all entries', () => {
    renderHelp();
    const input = screen.getByRole('searchbox', { name: /search help/i });
    fireEvent.change(input, { target: { value: 'zzz-nothing' } });
    expect(screen.getByText(/No help entries match/)).toHaveTextContent('zzz-nothing');
    expect(input).toHaveValue('zzz-nothing');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(screen.getByText('Connection dropped?')).toBeInTheDocument();
    expect(screen.getByText('Assessment privacy')).toBeInTheDocument();
    expect(screen.getByText('Still need help?')).toBeInTheDocument();
  });

  it('shows toast when Contact support button is clicked', () => {
    renderHelp();
    fireEvent.click(screen.getByRole('button', { name: 'Contact support' }));
    expect(screen.getByText(/Support request started/)).toBeInTheDocument();
  });
});