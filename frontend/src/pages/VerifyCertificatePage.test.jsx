import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VerifyCertificatePage from './VerifyCertificatePage';

vi.mock('../api/client', () => ({ api: { get: vi.fn() } }));

import { api } from '../api/client';

const certificate = {
  certificateId: 'c1',
  courseId: 'k1',
  serialNumber: 'CU-123',
  recipientName: 'Ana Reyes',
  courseName: 'Intro to Welding',
  providerName: 'Cebu Tech School',
  issuedAt: '2026-03-01T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/verify/CU-123']}>
      <Routes>
        <Route path="/verify/:serialNumber" element={<VerifyCertificatePage />} />
        <Route path="/" element={<div>Landing</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyCertificatePage', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('shows loading, then the verification result', async () => {
    let resolve;
    api.get.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Verifying certificate');
    expect(api.get.mock.calls[0][0]).toBe('/certificates/verify/CU-123');

    await act(async () => resolve(certificate));
    expect(await screen.findByText('Ana Reyes')).toBeInTheDocument();
    expect(screen.getByText('Intro to Welding')).toBeInTheDocument();
    expect(screen.getByText('CU-123')).toBeInTheDocument();
  });

  it('shows "not available" with a home link and no certificate details on 404', async () => {
    api.get.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }));
    renderPage();

    expect(await screen.findByText(/not available/i, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    expect(screen.queryByText('CU-123')).not.toBeInTheDocument();
    expect(screen.queryByText('Ana Reyes')).not.toBeInTheDocument();
  });

  it.each([
    ['network error', { status: 0 }],
    ['server error', { status: 503 }],
  ])('shows an error with retry on %s and re-sends the request', async (_label, extra) => {
    api.get.mockRejectedValueOnce(Object.assign(new Error('x'), extra)).mockResolvedValueOnce(certificate);
    renderPage();

    expect(await screen.findByText(/could not be completed/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Ana Reyes')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('shows the retryable error when the request exceeds 10 seconds', async () => {
    vi.useFakeTimers();
    api.get.mockImplementation((_path, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    );
    renderPage();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10001);
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByText(/could not be completed/i)).toBeInTheDocument();
  });
});
