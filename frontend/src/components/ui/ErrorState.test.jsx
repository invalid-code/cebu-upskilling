import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ErrorState, { getErrorMessage } from './ErrorState';
import EmptyState from '../shared/EmptyState';
import DataBoundView from './DataBoundView';
import { SkeletonStatus } from './Skeleton';

describe('getErrorMessage', () => {
  it('extracts strings, { error } and Error messages, else falls back', () => {
    expect(getErrorMessage('boom')).toBe('boom');
    expect(getErrorMessage({ error: 'api failed' })).toBe('api failed');
    expect(getErrorMessage(new Error('net down'))).toBe('net down');
    expect(getErrorMessage(null)).toMatch(/something went wrong/i);
    expect(getErrorMessage({})).toMatch(/something went wrong/i);
  });
});

describe('ErrorState', () => {
  it('renders an alert with the title and message', () => {
    render(<ErrorState error={{ error: 'Server unavailable' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable');
    expect(screen.getByRole('heading', { name: /couldn.t load this/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('calls onRetry on click and via keyboard', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState error="x" onRetry={onRetry} />);
    const retry = screen.getByRole('button', { name: /retry/i });
    await user.click(retry);
    retry.focus();
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('disables Retry and sets aria-busy while pending', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState error="x" onRetry={onRetry} pending />);
    const retry = screen.getByRole('button', { name: /retry/i });
    expect(retry).toBeDisabled();
    expect(retry).toHaveAttribute('aria-busy', 'true');
    await user.click(retry);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('keeps retained children visible', () => {
    render(<ErrorState error="x"><p>previous data</p></ErrorState>);
    expect(screen.getByText('previous data')).toBeInTheDocument();
  });
});

describe('EmptyState (ui contract)', () => {
  it('renders an anchor for href actions and a button otherwise', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<EmptyState title="None" action={{ label: 'Browse', href: '/courses' }} />);
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/courses');
    rerender(<EmptyState title="None" description="Nothing yet" action={{ label: 'Add', onClick }} />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('SkeletonStatus', () => {
  it('is a busy status region with a screen-reader label and reserved height', () => {
    render(<SkeletonStatus label="Loading jobs" minHeight={240}><span /></SkeletonStatus>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Loading jobs');
    expect(region.style.minHeight).toBe('240px');
  });
});

describe('DataBoundView (direct states)', () => {
  it('shows the custom loading label and skeleton while loading', () => {
    render(
      <DataBoundView
        state={{ status: 'loading' }}
        loadingLabel="Loading courses"
        skeleton={<div data-testid="custom-skeleton" />}
        minHeight={120}
      >
        {() => null}
      </DataBoundView>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading courses');
    expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument();
  });

  it('honours a custom isEmpty and renders children for non-empty data', () => {
    const { rerender } = render(
      <DataBoundView
        state={{ status: 'success', data: { items: [] } }}
        isEmpty={(d) => d.items.length === 0}
        empty={{ title: 'No items' }}
      >
        {() => <p>content</p>}
      </DataBoundView>,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    rerender(
      <DataBoundView
        state={{ status: 'success', data: { items: [1] } }}
        isEmpty={(d) => d.items.length === 0}
        empty={{ title: 'No items' }}
      >
        {() => <p>content</p>}
      </DataBoundView>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('wires Retry to state.reload on error', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    render(
      <DataBoundView state={{ status: 'error', error: { error: 'Nope' }, reload }}>{() => null}</DataBoundView>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Nope');
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('reduced motion', () => {
  it('global stylesheet shortens animations under prefers-reduced-motion', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration/);
  });
});
