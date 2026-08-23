import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CompanyProfilePage from './CompanyProfilePage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    upload: vi.fn(),
  },
}));

import { api } from '../api/client';

const company = {
  companyId: 9,
  name: 'Island Bites',
  logoUrl: '',
  description: 'Homegrown snack brand from Cebu.',
  industry: 'Food & Beverage',
  website: 'https://islandbites.example.com',
  location: 'Cebu City',
  companySize: '1-10',
};

const postsEnvelope = {
  items: [
    {
      postId: 3,
      companyId: 9,
      companyName: 'Island Bites',
      title: 'Weekend Market Crew',
      jobType: 'Part-time',
      location: 'Cebu City',
      salaryRange: '₱500/day',
      isActive: true,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/companies/9']}>
      <Routes>
        <Route path="/companies/:companyId" element={<CompanyProfilePage />} />
        <Route path="/jobs" element={<div>Jobs list</div>} />
        <Route path="/jobs/:postId" element={<div>Job detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CompanyProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the public profile with identity details', async () => {
    api.get.mockImplementation((url) =>
      url === '/companies/9'
        ? Promise.resolve(company)
        : Promise.resolve(postsEnvelope),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Island Bites' })).toBeInTheDocument();
    expect(screen.getAllByText(/Food & Beverage/).length).toBeGreaterThan(0);
    expect(screen.getByText('Food & Beverage · 1-10 employees · Cebu City')).toBeInTheDocument();
    expect(screen.getByText(/Homegrown snack brand from Cebu\./)).toBeInTheDocument();
  });

  it('lists the company open roles', async () => {
    api.get.mockImplementation((url) =>
      url === '/companies/9'
        ? Promise.resolve(company)
        : Promise.resolve(postsEnvelope),
    );

    renderPage();

    expect(await screen.findByText('Weekend Market Crew')).toBeInTheDocument();
    expect(screen.getByText(/Open roles \(1\)/)).toBeInTheDocument();
  });

  it('shows the empty state when the company is missing', async () => {
    api.get.mockRejectedValue(new Error('Not found'));

    renderPage();

    expect(await screen.findByText('Company unavailable')).toBeInTheDocument();
  });
});
