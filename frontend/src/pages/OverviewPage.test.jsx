import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext';
import OverviewPage from './OverviewPage';

function renderOverview() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <OverviewPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('OverviewPage', () => {
  it('renders the dashboard heading and match score', () => {
    renderOverview();
    expect(screen.getByRole('heading', { name: 'Your next move is clear.' })).toBeInTheDocument();
    expect(screen.getByText("You're 78% of the way to your target role.")).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('renders skill gaps and the pathway rail', () => {
    renderOverview();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Pathway rail')).toBeInTheDocument();
    expect(screen.getByText('Set your target role')).toBeInTheDocument();
  });

  it('renders recommended courses with enroll buttons', () => {
    renderOverview();
    expect(screen.getByText('Modern JavaScript for Frontend Work')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Enroll' })).toHaveLength(3);
  });

  it('shows a toast when a course is enrolled', () => {
    renderOverview();
    fireEvent.click(screen.getAllByRole('button', { name: 'Enroll' })[0]);
    expect(screen.getByText('Course added to your pathway')).toBeInTheDocument();
  });
});
