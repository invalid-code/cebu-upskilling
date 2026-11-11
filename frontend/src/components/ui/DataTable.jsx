import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import Icon from './Icon.jsx';
import styles from './DataTable.module.css';

const EMPTY_MESSAGE = 'No rows to show.';

function cellValue(column, row) {
  if (typeof column.sortValue === 'function') return column.sortValue(row);
  if (typeof column.accessor === 'function') return column.accessor(row);
  return row[column.key];
}

function isMissing(v) {
  return v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v));
}

/** Ascending comparison; missing values sort last in both directions (handled by caller). */
function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/** Stable sort of `rows` by `column` in `direction` ('asc' | 'desc'). Returns a new array. */
export function sortRows(rows, column, direction) {
  const dir = direction === 'desc' ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index, value: cellValue(column, row) }))
    .sort((x, y) => {
      const xm = isMissing(x.value);
      const ym = isMissing(y.value);
      if (xm || ym) return xm && ym ? x.index - y.index : xm ? 1 : -1;
      return compareValues(x.value, y.value) * dir || x.index - y.index;
    })
    .map((entry) => entry.row);
}

/**
 * Sortable, keyboard-navigable table that stacks rows below 640px.
 *
 * columns: [{ key, label, sortable?, accessor?(row), sortValue?(row), render?(row) }]
 * rows: array of row objects; getRowId(row) returns a stable identifier.
 * onRowSelect(id): called once per selection (click, Enter or Space).
 * caption: required, non-empty description of the table.
 */
export function DataTable({ columns, rows, getRowId, onRowSelect, caption }) {
  const [sort, setSort] = useState({ key: null, direction: null });
  const [focusIndex, setFocusIndex] = useState(0);
  const rowRefs = useRef([]);

  const captionText = typeof caption === 'string' ? caption.trim() : '';

  const sortedRows = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const column = columns.find((c) => c.key === sort.key);
    return column && sort.direction ? sortRows(list, column, sort.direction) : list;
  }, [rows, columns, sort]);

  if (!captionText) {
    console.error('DataTable: `caption` is required and must be a non-empty string.');
    return null;
  }

  const toggleSort = (column) => {
    setSort((prev) => ({
      key: column.key,
      direction: prev.key === column.key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const select = (row) => {
    if (onRowSelect) onRowSelect(getRowId(row));
  };

  const moveFocus = (next) => {
    const clamped = Math.min(Math.max(next, 0), sortedRows.length - 1);
    setFocusIndex(clamped);
    rowRefs.current[clamped]?.focus();
  };

  const onRowKeyDown = (event, row, index) => {
    // Ignore keys bubbling from interactive descendants (buttons, links, inputs).
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(index - 1);
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      select(row);
    }
  };

  const activeIndex = Math.min(focusIndex, Math.max(sortedRows.length - 1, 0));

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className={styles.caption}>{captionText}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const sorted = sort.key === column.key ? sort.direction : null;
              const ariaSort = sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined;
              return (
                <th key={column.key} scope="col" aria-sort={column.sortable ? ariaSort : undefined} className={styles.th}>
                  {column.sortable ? (
                    <button type="button" className={styles.sortButton} onClick={() => toggleSort(column)}>
                      <span>{column.label}</span>
                      {sorted && (
                        <Icon
                          as={sorted === 'asc' ? ArrowUp : ArrowDown}
                          size={14}
                          aria-hidden="true"
                          data-testid="sort-indicator"
                        />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr className={styles.emptyRow}>
              <td colSpan={Math.max(columns.length, 1)} className={styles.empty}>
                {EMPTY_MESSAGE}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, index) => (
              <tr
                key={getRowId(row)}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                tabIndex={index === activeIndex ? 0 : -1}
                className={styles.row}
                onClick={() => select(row)}
                onFocus={(e) => {
                  if (e.target === e.currentTarget) setFocusIndex(index);
                }}
                onKeyDown={(e) => onRowKeyDown(e, row, index)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={styles.td}>
                    <span className={styles.label}>{column.label}</span>
                    <span className={styles.value}>
                      {typeof column.render === 'function' ? column.render(row) : cellValue(column, row)}
                    </span>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
