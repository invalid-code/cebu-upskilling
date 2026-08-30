import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LearnerRoute, RecruiterRoute, CourseProviderRoute, CourseStudioRoute } from './RoleRoute';

function renderRoute(role, initialPath, element) {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role }));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<>HomePlaceholder</>} />
          <Route path="/dashboard" element={<>LearnerDashboardPlaceholder</>} />
          <Route path="/business-dashboard" element={<>DashboardPlaceholder</>} />
          <Route path="/provider-dashboard" element={<>ProviderDashboardPlaceholder</>} />
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

  it('LearnerRoute redirects CourseProviders to provider dashboard', () => {
    renderRoute('CourseProvider', '/protected', <LearnerRoute />);
    expect(screen.getByText('ProviderDashboardPlaceholder')).toBeInTheDocument();
    expect(screen.queryByText('ProtectedContent')).not.toBeInTheDocument();
  });

  it('RecruiterRoute renders its outlet for recruiters', () => {
    renderRoute('Recruiter', '/protected', <RecruiterRoute />);

    expect(screen.getByText('ProtectedContent')).toBeInTheDocument();
  });

  it('RecruiterRoute redirects learners to the dashboard', () => {
    renderRoute('Learner', '/protected', <RecruiterRoute />);

    expect(screen.getByText('LearnerDashboardPlaceholder')).toBeInTheDocument();
    expect(screen.queryByText('ProtectedContent')).not.toBeInTheDocument();
  });

  it('RecruiterRoute redirects CourseProviders to provider dashboard', () => {
    renderRoute('CourseProvider', '/protected', <RecruiterRoute />);
    expect(screen.getByText('ProviderDashboardPlaceholder')).toBeInTheDocument();
    expect(screen.queryByText('ProtectedContent')).not.toBeInTheDocument();
  });

  it('CourseProviderRoute renders for providers', () => {
    renderRoute('CourseProvider', '/protected', <CourseProviderRoute />);
    expect(screen.getByText('ProtectedContent')).toBeInTheDocument();
  });

  it('CourseProviderRoute redirects learners and recruiters', () => {
    renderRoute('Learner', '/protected', <CourseProviderRoute />);
    expect(screen.getByText('LearnerDashboardPlaceholder')).toBeInTheDocument();
    renderRoute('Recruiter', '/protected', <CourseProviderRoute />);
    expect(screen.getByText('DashboardPlaceholder')).toBeInTheDocument();
  });

  it('CourseStudioRoute allows Recruiter', () => {
    renderRoute('Recruiter', '/protected', <CourseStudioRoute />);
    expect(screen.getByText('ProtectedContent')).toBeInTheDocument();
  });

  it('CourseStudioRoute allows CourseProvider', () => {
    renderRoute('CourseProvider', '/protected', <CourseStudioRoute />);
    expect(screen.getByText('ProtectedContent')).toBeInTheDocument();
  });

  it('CourseStudioRoute redirects learners to dashboard', () => {
    renderRoute('Learner', '/protected', <CourseStudioRoute />);
    expect(screen.getByText('LearnerDashboardPlaceholder')).toBeInTheDocument();
    expect(screen.queryByText('ProtectedContent')).not.toBeInTheDocument();
  });
});