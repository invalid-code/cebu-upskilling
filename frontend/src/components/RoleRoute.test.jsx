import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LearnerRoute, RecruiterRoute } from './RoleRoute';

function renderRoute(role, initialPath, element) {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role }));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<>HomePlaceholder</>} />
          <Route path="/business-dashboard" element={<>DashboardPlaceholder</>} />
          <Route path="/protected" element={element}>
            <Route index element={<div>ProtectedContent</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RoleRoute', () => {
  it('LearnerRoute renders its outlet for learners', () => {
    renderRoute('Learner', '/protected', <LearnerRoute />);

    expect(screen.getByText('ProtectedContent')).toBeInTheDocument();
  });

  it('LearnerRoute redirects recruiters to the business dashboard', () => {
    renderRoute('Recruiter', '/protected', <LearnerRoute />);

    expect(screen.getByText('DashboardPlaceholder')).toBeInTheDocument();
    expect(screen.queryByText('ProtectedContent')).not.toBeInTheDocument();
  });

  it('RecruiterRoute renders its outlet for recruiters', () => {
    renderRoute('Recruiter', '/protected', <RecruiterRoute />);

    expect(screen.getByText('ProtectedContent')).toBeInTheDocument();
  });

  it('RecruiterRoute redirects learners to the home page', () => {
    renderRoute('Learner', '/protected', <RecruiterRoute />);

    expect(screen.getByText('HomePlaceholder')).toBeInTheDocument();
    expect(screen.queryByText('ProtectedContent')).not.toBeInTheDocument();
  });
});