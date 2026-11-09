import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LandingPage from './LandingPage';
import { fetchPublicStats, parsePublicStats } from '../api/publicStats';

vi.mock('../api/publicStats', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPublicStats: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
  isRecruiter: () => false,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.mocked(fetchPublicStats).mockReset();
  });

  it('shows both counts exactly as returned', async () => {
    vi.mocked(fetchPublicStats).mockResolvedValue({ jobCount: 1234, courseCount: 0 });
    renderPage();
    expect(await screen.findByTestId('stat-jobs')).toHaveTextContent(/^1234$/);
    expect(screen.getByTestId('stat-courses')).toHaveTextContent(/^0$/);
  });

  it('omits the stats section silently when there is no data', async () => {
    vi.mocked(fetchPublicStats).mockResolvedValue(null);
    renderPage();
    await waitFor(() => expect(fetchPublicStats).toHaveBeenCalled());
    expect(screen.queryByTestId('stat-jobs')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders exactly one WaterCanvas, inside the hero', async () => {
    vi.mocked(fetchPublicStats).mockResolvedValue(null);
    const { container } = renderPage();
    const canvases = screen.getAllByTestId('water-canvas');
    expect(canvases).toHaveLength(1);
    const hero = container.querySelector('[aria-labelledby="hero-title"]');
    expect(hero).toContainElement(canvases[0]);
  });

  it('places one WaveDivider between each pair of adjacent sections', async () => {
    vi.mocked(fetchPublicStats).mockResolvedValue(null);
    const { container } = renderPage();
    const sectionCount = () => container.querySelectorAll('main section').length;
    expect(screen.getAllByTestId('wave-divider')).toHaveLength(sectionCount() - 1);

    vi.mocked(fetchPublicStats).mockResolvedValue({ jobCount: 3, courseCount: 4 });
    const second = renderPage();
    await screen.findAllByTestId('stat-jobs');
    expect(within(second.container).getAllByTestId('wave-divider')).toHaveLength(
      second.container.querySelectorAll('main section').length - 1,
    );
  });

  it('contains no placeholder text or hard-coded statistics', async () => {
    vi.mocked(fetchPublicStats).mockResolvedValue(null);
    const { container } = renderPage();
    const text = container.textContent;
    expect(text).not.toMatch(/lorem ipsum|\bTODO\b|\bTBD\b|coming soon/i);
    expect(text).not.toMatch(/\d+(\.\d+)?\s?%/);
  });
});

describe('parsePublicStats', () => {
  it('accepts non-negative integers', () => {
    expect(parsePublicStats({ jobCount: 0, courseCount: 7 })).toEqual({ jobCount: 0, courseCount: 7 });
  });

  it.each([
    null,
    {},
    { jobCount: 1 },
    { jobCount: -1, courseCount: 2 },
    { jobCount: 1.5, courseCount: 2 },
    { jobCount: '3', courseCount: 2 },
    { jobCount: NaN, courseCount: 2 },
    { jobCount: 1, courseCount: null },
  ])('rejects %j', (payload) => {
    expect(parsePublicStats(payload)).toBeNull();
  });
});
