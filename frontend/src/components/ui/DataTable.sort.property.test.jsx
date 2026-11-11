import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';
import DataTable, { sortRows } from './DataTable';

// Feature: frontend-design, Property 11: Table sort order
// **Validates: Requirements 20.1**

afterEach(cleanup);

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'score', label: 'Score', sortable: true },
];
const scoreColumn = columns[1];
const getRowId = (r) => r.id;

const rowsArb = fc
  .array(fc.record({ name: fc.string({ maxLength: 8 }), score: fc.integer({ min: -1000, max: 1000 }) }), {
    maxLength: 25,
  })
  .map((list) => list.map((r, i) => ({ id: `r${i}`, ...r })));

const sortedIds = (rows) => rows.map((r) => r.id).sort();

describe('Property 11: Table sort order', () => {
  it('sortRows orders rows by column value in both directions and preserves the multiset of rows', () => {
    fc.assert(
      fc.property(rowsArb, (rows) => {
        const original = [...rows];
        const asc = sortRows(rows, scoreColumn, 'asc');
        const desc = sortRows(rows, scoreColumn, 'desc');

        expect(rows).toEqual(original); // input not mutated
        expect(sortedIds(asc)).toEqual(sortedIds(rows));
        expect(sortedIds(desc)).toEqual(sortedIds(rows));
        for (let i = 1; i < asc.length; i += 1) {
          expect(asc[i - 1].score).toBeLessThanOrEqual(asc[i].score);
          expect(desc[i - 1].score).toBeGreaterThanOrEqual(desc[i].score);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('activating a sortable header sorts ascending, then descending on the second activation', () => {
    fc.assert(
      fc.property(rowsArb, (rows) => {
        const { container, unmount } = render(
          <DataTable columns={columns} rows={rows} getRowId={getRowId} caption="Scores" />,
        );
        const renderedScores = () =>
          Array.from(container.querySelectorAll('tbody tr')).map((tr) =>
            tr.querySelectorAll('td')[1]?.querySelector('span:last-child')?.textContent,
          );
        const header = screen.getByRole('button', { name: /score/i });

        if (rows.length > 0) {
          fireEvent.click(header);
          const asc = renderedScores();
          expect(asc).toEqual(sortRows(rows, scoreColumn, 'asc').map((r) => String(r.score)));
          expect(asc.map(Number)).toEqual([...rows.map((r) => r.score)].sort((a, b) => a - b));

          fireEvent.click(header);
          const desc = renderedScores();
          expect(desc.map(Number)).toEqual([...rows.map((r) => r.score)].sort((a, b) => b - a));
          expect(desc.slice().sort()).toEqual(asc.slice().sort()); // same multiset
        } else {
          fireEvent.click(header);
          expect(container.querySelectorAll('tbody tr')).toHaveLength(1); // empty-state row only
        }
        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
