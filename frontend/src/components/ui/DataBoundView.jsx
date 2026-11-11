import EmptyState from '../shared/EmptyState';
import ErrorState from './ErrorState';
import { SkeletonStatus, SkeletonCard } from './Skeleton';

const defaultIsEmpty = (data) => data == null || (Array.isArray(data) && data.length === 0);

/**
 * Renders the loading / empty / error / success state of a data-bound page.
 *
 * Props:
 * - `state`: the object returned by `useDataState` ({ status, data, error, reload })
 * - `skeleton`: placeholder shaped like the final layout (defaults to one card)
 * - `minHeight`: reserved height of the region so the swap to real content causes no layout shift
 * - `empty`: `{ title, description, action }` for EmptyState (at most one primary action)
 * - `isEmpty(data)`: override for emptiness (default: null/undefined or empty array)
 * - `loadingLabel`: screen-reader label for the skeleton
 * - `errorTitle`: optional heading for the error state
 * - `children(data)`: renders the success content; also used to keep previous data visible under an error
 */
export default function DataBoundView({
  state,
  skeleton,
  minHeight,
  empty,
  isEmpty = defaultIsEmpty,
  loadingLabel = 'Loading...',
  errorTitle,
  children,
}) {
  const { status, data, error, reload } = state;

  if (status === 'loading') {
    // Covers both the first load and a pending retry: Retry is not rendered, so it cannot be re-triggered.
    return (
      <SkeletonStatus label={loadingLabel} minHeight={minHeight}>
        {skeleton || <SkeletonCard minHeight={minHeight} />}
      </SkeletonStatus>
    );
  }

  if (status === 'error') {
    const hasData = data !== undefined && !isEmpty(data);
    return (
      <ErrorState error={error} onRetry={reload} {...(errorTitle ? { title: errorTitle } : null)}>
        {hasData ? children(data) : null}
      </ErrorState>
    );
  }

  if (isEmpty(data)) {
    return <EmptyState {...empty} />;
  }

  return children(data);
}
