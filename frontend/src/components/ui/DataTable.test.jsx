import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DataTable from './DataTable';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'score', label: 'Score', sortable: true },
  { key: 'note', label: 'Note' },
];
const rows = [
  { id: 'a', name: 'Cara', score: 5, note: 'x' },
  { id: 'b', name: 'Abe', score: 20, note: 'y' },
  { id: 'c', name: 'Ben', score: 10, note: 'z' },
];
const getRowId = (r) => r.id;

function setup(props = {}) {
  const onRowSelect = vi.fn();
  render(
    <DataTable columns={columns} rows={rows} getRowId={getRowId} onRowSelect={onRowSelect} caption="People" {...props} />,
  );
  return { onRowSelect };
}

const bodyNames = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('DataTable', () => {
  it('renders a caption and returns nothing for a blank caption', () => {
    setup();
    expect(screen.getByText('People').tagName).toBe('CAPTION');
  });

  it('does not render with a blank caption', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<DataTable columns={columns} rows={rows} getRowId={getRowId} caption="  " />);
    expect(container).toBeEmptyDOMElement();
    spy.mockRestore();
  });

  it('sorts asc then desc, moves aria-sort and clears other headers', async () => {
    const user = userEvent.setup();
    setup();
    const nameBtn = screen.getByRole('button', { name: /Name/ });
    await user.click(nameBtn);
    expect(bodyNames().map((t) => t.replace('Name', ''))).toEqual(['Abe', 'Ben', 'Cara']);
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending');
    await user.click(nameBtn);
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'descending');
    await user.click(screen.getByRole('button', { name: /Score/ }));
    expect(screen.getByRole('columnheader', { name: /Name/ })).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('columnheader', { name: /Score/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getAllByTestId('sort-indicator')).toHaveLength(1);
  });

  it('sorts via keyboard Enter and Space', async () => {
    const user = userEvent.setup();
    setup();
    screen.getByRole('button', { name: /Score/ }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('columnheader', { name: /Score/ })).toHaveAttribute('aria-sort', 'ascending');
    await user.keyboard(' ');
    expect(screen.getByRole('columnheader', { name: /Score/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('moves row focus with arrows without wrapping', async () => {
    const user = userEvent.setup();
    setup();
    const dataRows = () => screen.getAllByRole('row').slice(1);
    dataRows()[0].focus();
    await user.keyboard('{ArrowUp}');
    expect(dataRows()[0]).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(dataRows()[2]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(dataRows()[2]).toHaveFocus();
  });

  it('calls onRowSelect exactly once for click, Enter and Space', async () => {
    const user = userEvent.setup();
    const { onRowSelect } = setup();
    const first = screen.getAllByRole('row')[1];
    await user.click(first);
    expect(onRowSelect).toHaveBeenCalledTimes(1);
    expect(onRowSelect).toHaveBeenLastCalledWith('a');
    first.focus();
    await user.keyboard('{Enter}');
    expect(onRowSelect).toHaveBeenCalledTimes(2);
    await user.keyboard(' ');
    expect(onRowSelect).toHaveBeenCalledTimes(3);
  });

  it('keeps headers and shows a message with zero rows, never selecting', async () => {
    const user = userEvent.setup();
    const { onRowSelect } = setup({ rows: [] });
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    const msg = screen.getByText('No rows to show.');
    await user.click(msg);
    expect(onRowSelect).not.toHaveBeenCalled();
  });
});

describe('DataTable gaps', () => {
  it('renders a column label in every cell for the stacked layout', () => {
    setup();
    const firstRow = screen.getAllByRole('row')[1];
    const cells = within(firstRow).getAllByRole('cell');
    expect(cells).toHaveLength(3);
    expect(cells[1]).toHaveTextContent('Score');
    expect(cells[1]).toHaveTextContent('5');
  });

  it('uses column.render and column.accessor for cell content', () => {
    setup({
      columns: [
        { key: 'name', label: 'Name', render: (r) => <b>{r.name}!</b> },
        { key: 'double', label: 'Double', accessor: (r) => r.score * 2 },
      ],
    });
    expect(screen.getByText('Cara!').tagName).toBe('B');
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('puts aria-sort only on sortable headers and uses scope=col', () => {
    setup();
    const headers = screen.getAllByRole('columnheader');
    headers.forEach((h) => expect(h).toHaveAttribute('scope', 'col'));
    expect(screen.getByRole('columnheader', { name: /Note/ })).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('columnheader', { name: /Name/ })).not.toHaveAttribute('aria-sort');
  });

  it('uses a roving tabindex: only one row is tabbable', () => {
    setup();
    const tabbable = screen.getAllByRole('row').slice(1).filter((r) => r.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
  });

  it('does not throw when onRowSelect is omitted', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} rows={rows} getRowId={getRowId} caption="People" />);
    await user.click(screen.getAllByRole('row')[1]);
    expect(screen.getByText('People')).toBeInTheDocument();
  });
});
