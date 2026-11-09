import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { lazyPage, retryFailedPages } from './lazyPage';
import ChunkErrorBoundary from '../components/shared/ChunkErrorBoundary';

describe('chunk-load error retry', () => {
  it('shows a retryable error, then re-requests the chunk and renders the page', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValue({ default: () => <p>Loaded page</p> });
    const Page = lazyPage(factory);

    render(
      <div>
        <h1>Shell stays</h1>
        <ChunkErrorBoundary onRetry={retryFailedPages}>
          <Suspense fallback={<p>Loading…</p>}>
            <Page />
          </Suspense>
        </ChunkErrorBoundary>
      </div>,
    );

    expect(await screen.findByText(/This page could not be loaded/i, { selector: 'p, div, span' })).toBeInTheDocument();
    expect(screen.getByText('Shell stays')).toBeInTheDocument();
    expect(factory).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Loaded page')).toBeInTheDocument();
    expect(factory).toHaveBeenCalledTimes(2);
    errSpy.mockRestore();
  });

  it('does not reload pages that never failed', async () => {
    const ok = vi.fn().mockResolvedValue({ default: () => <p>Fine</p> });
    const Page = lazyPage(ok);
    render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>,
    );
    expect(await screen.findByText('Fine')).toBeInTheDocument();
    retryFailedPages();
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
