import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DataBoundView from './DataBoundView';
import ErrorState from './ErrorState';
import EmptyState from '../shared/EmptyState';
import useDataState from '../../hooks/useDataState';

function Harness({ fetcher, empty }) {
  const state = useDataState(fetcher, []);
  return (
    <DataBoundView state={state} minHeight={120} loadingLabel="Loading items" empty={empty}>
      {(items) => <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>}
    </DataBoundView>
  );
}

describe('page states', () => {
  it('shows a skeleton with reserved height, then data', async () => {
    render(<Harness fetcher={() => Promise.resolve(['a'])} />);
    const status = screen.getByRole('status');
    expect(status.style.minHeight).toBe('120px');
    expect(await screen.findByText('a')).toBeInTheDocument();
  });

  it('shows empty state with exactly one primary action', async () => {
    const onClick = vi.fn();
    render(<Harness fetcher={() => Promise.resolve([])} empty={{ title: 'Nothing', action: { label: 'Add one', onClick } }} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add one' }));
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows the error message and retries, showing a skeleton while pending', async () => {
    let resolveRetry;
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockImplementationOnce(() => new Promise((r) => { resolveRetry = r; }));
    render(<Harness fetcher={fetcher} />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    resolveRetry(['ok']);
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
  });

  it('retains previously displayed data when a reload fails', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(['kept'])
      .mockRejectedValueOnce(new Error('later failure'));
    function Reloader() {
      const state = useDataState(fetcher, []);
      return (
        <>
          <button onClick={state.reload}>reload</button>
          <DataBoundView state={state}>{(items) => <p>{items[0]}</p>}</DataBoundView>
        </>
      );
    }
    render(<Reloader />);
    await screen.findByText('kept');
    await userEvent.click(screen.getByText('reload'));
    expect(await screen.findByText('later failure')).toBeInTheDocument();
    expect(screen.getByText('kept')).toBeInTheDocument();
  });

  it('disables Retry while pending', () => {
    render(<ErrorState error={{ error: 'bad' }} onRetry={() => {}} pending />);
    expect(screen.getByText('bad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeDisabled();
  });

  it('EmptyState renders a link action', () => {
    render(<EmptyState title="x" action={{ label: 'Go', href: '/go' }} />);
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/go');
  });
});
