import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { api } from '../api/client';
import ProfilePage from './ProfilePage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    upload: vi.fn(),
  },
}));

function setUser(role = 'Learner', overrides = {}) {
  const user = {
    firstName: 'Juan',
    lastName: 'Cruz',
    emailAddress: 'juan@example.com',
    role,
    targetRole: 'Frontend Developer',
    address: 'Cebu City',
    remoteFriendly: false,
    ...overrides,
  };
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', 'abc');
  return user;
}

function renderProfilePage({ role = 'Learner', initialEntries = ['/profile'], userOverrides } = {}) {
  setUser(role, userOverrides);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/dashboard" element={<div>DashboardPage</div>} />
            <Route path="/business-dashboard" element={<div>BusinessDashboardPage</div>} />
            <Route path="/provider-dashboard" element={<div>ProviderDashboardPage</div>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/" element={<div>LandingPage</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    api.get.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the profile heading and user info', async () => {
    renderProfilePage({ role: 'Learner' });

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();
    expect(screen.getByText('Juan Cruz')).toBeInTheDocument();
    expect(screen.getByText('juan@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Learner account/)).toBeInTheDocument();
  });

  it('renders a Go back button instead of a link to the landing page', () => {
    renderProfilePage();

    const backButton = screen.getByRole('button', { name: 'Go back' });
    expect(backButton).toBeInTheDocument();
    expect(backButton.tagName).toBe('BUTTON');
    // Should not be a link to "/"
    expect(screen.queryByRole('link', { name: /Back to overview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go back' })).not.toBeInTheDocument();
  });

  it('navigates back to the previous page when history exists', async () => {
    renderProfilePage({ initialEntries: ['/dashboard', '/profile'] });

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(await screen.findByText('DashboardPage')).toBeInTheDocument();
  });

  it('falls back to the learner dashboard when there is no history', async () => {
    renderProfilePage({ role: 'Learner', initialEntries: ['/profile'] });

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(await screen.findByText('DashboardPage')).toBeInTheDocument();
  });

  it('falls back to the business dashboard for recruiters when there is no history', async () => {
    renderProfilePage({ role: 'Recruiter', initialEntries: ['/profile'] });

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(await screen.findByText('BusinessDashboardPage')).toBeInTheDocument();
  });

  it('falls back to the provider dashboard for course providers when there is no history', async () => {
    renderProfilePage({ role: 'CourseProvider', initialEntries: ['/profile'] });

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(await screen.findByText('ProviderDashboardPage')).toBeInTheDocument();
  });

  it('uses history.length fallback when state idx is not a number', async () => {
    renderProfilePage({ role: 'Learner', initialEntries: ['/profile'] });

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();

    // Simulate a history state without idx (e.g., direct navigation in some browsers)
    // so the `typeof idx === 'number'` check is false and `history.length` is consulted.
    // With length === 1 the fallback branch should still navigate to the dashboard.
    const originalStateDesc = Object.getOwnPropertyDescriptor(window.history, 'state');
    const originalLengthDesc = Object.getOwnPropertyDescriptor(window.history, 'length');

    try {
      Object.defineProperty(window.history, 'state', {
        get: () => ({}),
        configurable: true,
      });
      Object.defineProperty(window.history, 'length', {
        get: () => 1,
        configurable: true,
      });
    } catch {
      // ignore if not configurable in this jsdom version
    }

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(await screen.findByText('DashboardPage')).toBeInTheDocument();

    try {
      if (originalStateDesc) Object.defineProperty(window.history, 'state', originalStateDesc);
      else delete window.history.state;
      if (originalLengthDesc) Object.defineProperty(window.history, 'length', originalLengthDesc);
    } catch {
      // ignore restore failures
    }
  });

  it('does not navigate to the landing page when going back', async () => {
    renderProfilePage({ initialEntries: ['/dashboard', '/profile'] });
    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(await screen.findByText('DashboardPage')).toBeInTheDocument();
    expect(screen.queryByText('LandingPage')).not.toBeInTheDocument();
  });
});

describe('ProfilePage resume', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    api.get.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows resume link when user has resumeUrl', () => {
    const resumeUrl = 'https://fake-storage.example/resumes/abc123.pdf';
    renderProfilePage({ userOverrides: { firstName: 'Jose', lastName: 'Rizal', resumeUrl } });
    const link = screen.getByTestId('resume-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', resumeUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Your resume')).toBeInTheDocument();
  });

  it('does not show resume link when user has no resumeUrl', () => {
    renderProfilePage({ role: 'CourseProvider', userOverrides: { resumeUrl: null } });
    expect(screen.queryByTestId('resume-link')).not.toBeInTheDocument();
  });

  it('does not show resume link for recruiter without resume', () => {
    renderProfilePage({ role: 'Recruiter' });
    expect(screen.queryByTestId('resume-link')).not.toBeInTheDocument();
  });

  it('renders resume url text for sharing', () => {
    const resumeUrl = 'https://fake-storage.example/resumes/xyz.docx';
    renderProfilePage({ userOverrides: { firstName: 'Jose', lastName: 'Rizal', resumeUrl } });
    expect(screen.getByText(resumeUrl)).toBeInTheDocument();
  });
});

describe('ProfilePage parsed skills', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const skills = [
    { skillId: 1, name: 'React', category: 'Framework', currentLevel: 3, verified: false },
    { skillId: 2, name: 'Python', category: 'Language', currentLevel: 0, verified: true },
  ];

  it('loads parsed skills for learners from /skills', async () => {
    api.get.mockResolvedValue(skills);
    renderProfilePage({ role: 'Learner' });

    expect(await screen.findByText('Skills from your resume')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/skills');
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText(/Intermediate/)).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('marks verified skills and unassessed levels', async () => {
    api.get.mockResolvedValue(skills);
    renderProfilePage({ role: 'Learner' });

    expect(await screen.findByText(/Verified/)).toBeInTheDocument();
    expect(screen.getByText(/Unassessed/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Verify skills in Assessments/ })).toHaveAttribute('href', '/assessments');
  });

  it('shows an empty state when no skills were parsed', async () => {
    api.get.mockResolvedValue([]);
    renderProfilePage({ role: 'Learner' });

    expect(await screen.findByText(/No parsed skills yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('parsed-skills')).not.toBeInTheDocument();
  });

  it('shows an error note when loading fails', async () => {
    api.get.mockRejectedValue(new Error('network down'));
    renderProfilePage({ role: 'Learner' });

    expect(await screen.findByText(/Could not load your parsed skills/)).toBeInTheDocument();
  });

  it('hides the skills section for non-learners without fetching', async () => {
    api.get.mockResolvedValue(skills);
    renderProfilePage({ role: 'Recruiter' });

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();
    expect(screen.queryByText('Skills from your resume')).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/skills');
  });
});
