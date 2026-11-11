import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CertificateDetailPage from './CertificateDetailPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '../api/client';

function renderCertificate() {
  return render(
    <MemoryRouter initialEntries={['/credentials/cert-1']}>
      <Routes>
        <Route path="/credentials/:certificateId" element={<CertificateDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CertificateDetailPage', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('renders the certificate details', async () => {
    api.get.mockResolvedValue({
      certificateId: 'cert-1',
      courseId: 'course-1',
      serialNumber: 'CU-2026-AB12CD34EF',
      recipientName: 'Maria Santos',
      courseName: 'Customer Support Essentials',
      providerName: 'Cebu Skills Academy',
      issuedAt: '2026-11-03T12:00:00Z',
    });

    renderCertificate();

    expect(await screen.findByText('Customer Support Essentials')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Cebu Skills Academy')).toBeInTheDocument();
    expect(screen.getByText(/CU-2026-AB12CD34EF/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/certificates/cert-1');
    expect(screen.getByRole('button', { name: /Print or save as PDF/ })).toBeInTheDocument();
  });

  it('shows a not-found state when the certificate is missing', async () => {
    api.get.mockRejectedValue(new Error('Certificate not found'));
    renderCertificate();
    expect(await screen.findByText('Certificate unavailable')).toBeInTheDocument();
    expect(screen.getByText('Certificate not found')).toBeInTheDocument();
  });
});
