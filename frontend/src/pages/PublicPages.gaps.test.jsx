import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import RegisterPage from './RegisterPage';
import CompanyProfilePage from './CompanyProfilePage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import TermsOfServicePage from './TermsOfServicePage';

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), upload: vi.fn(), postForm: vi.fn() },
}));
vi.mock('../components/GoogleSignInButton', () => ({ default: () => null }));

import { api } from '../api/client';

beforeEach(() => vi.clearAllMocks());

describe('RegisterPage stepper', () => {
  function renderRegister() {
    return render(
      <MemoryRouter initialEntries={['/register']}>
        <ToastProvider>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>,
    );
  }

  it('shows exactly two steps with a step indicator and text status', () => {
    renderRegister();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2: Current')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2: Not started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Account/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('stays on step 1 when account fields are invalid', () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: 'Next: Profile' }));
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Account/ })).toHaveAttribute('aria-current', 'step');
  });

  it('advances to step 2 with valid account data and can go back', () => {
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Jose' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Rizal' } });
    fireEvent.change(document.getElementById('register-email'), { target: { value: 'jose@example.com' } });
    fireEvent.change(document.getElementById('register-password'), { target: { value: 'secret123' } });
    fireEvent.change(document.getElementById('register-confirm-password'), { target: { value: 'secret123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Next: Profile' }));
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2: Completed')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2: Current')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('First name')).toHaveValue('Jose');
  });
});

describe('CompanyProfilePage extra states', () => {
  const company = { companyId: 9, name: 'Island Bites', industry: 'Food', description: 'Snacks.' };

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/companies/9']}>
        <Routes>
          <Route path="/companies/:companyId" element={<CompanyProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('shows the no-posts message when the company has no job posts', async () => {
    api.get.mockImplementation((url) =>
      Promise.resolve(url === '/companies/9' ? company : { items: [], total: 0 }),
    );
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Island Bites' })).toBeInTheDocument();
    expect(screen.getByText('No job posts available')).toBeInTheDocument();
  });

  it('shows a landing link and no company data when loading fails', async () => {
    api.get.mockRejectedValue(new Error('Not found'));
    renderPage();
    expect(await screen.findByText('Company unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /CebuUpskilling home/ })).toHaveAttribute('href', '/');
    expect(screen.queryByText('Island Bites')).not.toBeInTheDocument();
    expect(screen.queryByText('No job posts available')).not.toBeInTheDocument();
  });

  it('shows no company data when only the posts request fails', async () => {
    api.get.mockImplementation((url) =>
      url === '/companies/9' ? Promise.resolve(company) : Promise.reject(new Error('boom')),
    );
    renderPage();
    expect(await screen.findByText('Company unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Island Bites' })).not.toBeInTheDocument();
  });
});

describe('legal pages share the reading template', () => {
  it.each([
    ['Privacy', PrivacyPolicyPage],
    ['Terms', TermsOfServicePage],
  ])('%s page renders through the shared template', async (_n, Page) => {
    const { container } = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('reading-template')).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('h1')).toBeInTheDocument());
  });

  it('applies identical typography classes on both pages', () => {
    const classesOf = (Page) => {
      const { container, unmount } = render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>,
      );
      const pick = (sel) => container.querySelector(sel)?.className ?? null;
      const result = {
        page: screen.getByTestId('reading-template').className,
        title: pick('h1'),
        sectionTitle: pick('h2'),
        body: pick('h2 + p'),
      };
      unmount();
      return result;
    };
    const privacy = classesOf(PrivacyPolicyPage);
    const terms = classesOf(TermsOfServicePage);
    expect(privacy.title).toBeTruthy();
    expect(privacy).toEqual(terms);
  });
});
