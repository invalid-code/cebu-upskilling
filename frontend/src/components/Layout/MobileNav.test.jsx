import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import MobileNav, { splitMobileItems } from './MobileNav';

function renderMobileNav(role) {
  localStorage.clear();
  if (role) {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role }));
    localStorage.setItem('token', 'abc');
  }
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MobileNav />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('splitMobileItems', () => {
  const make = (n) => Array.from({ length: n }, (_, i) => ({ to: `/p${i}` }));

  it('shows every destination when there are 5 or fewer', () => {
    for (const n of [0, 1, 3, 5]) {
      const { visible, overflow } = splitMobileItems(make(n));
      expect(visible).toHaveLength(n);
      expect(overflow).toHaveLength(0);
    }
  });

  it('shows the first 4 and overflows the rest when over 5', () => {
    const { visible, overflow } = splitMobileItems(make(8));
    expect(visible.map((i) => i.to)).toEqual(['/p0', '/p1', '/p2', '/p3']);
    expect(overflow).toHaveLength(4);
  });
});

describe('MobileNav', () => {
  it('shows the first 4 learner destinations plus More', () => {
    renderMobileNav('Learner');

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument();
    expect(screen.queryByText('Apps')).not.toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getAllByRole('link')).toHaveLength(4);
  });

  it('opens More to reach the remaining destinations', () => {
    renderMobileNav('Learner');

    fireEvent.click(screen.getByRole('button', { name: /more/i }));

    expect(screen.getByRole('button', { name: /more/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Credentials')).toBeInTheDocument();
    expect(screen.getByText('Help center')).toBeInTheDocument();
  });

  it('shows the first 4 recruiter destinations plus More', () => {
    renderMobileNav('Recruiter');

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Post')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Skills')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no user', () => {
    const { container } = renderMobileNav(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows all provider destinations without More (3 destinations)', () => {
    renderMobileNav('CourseProvider');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Post')).not.toBeInTheDocument();
  });

  it('provider links are case-insensitive', () => {
    renderMobileNav('courseprovider');
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });
});
