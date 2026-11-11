import { createElement, lazy } from 'react';

const failedLoaders = new Set();

/**
 * React.lazy with retry support: a rejected import is not cached forever. `retryFailedPages()`
 * recreates the lazy component of every page whose chunk failed, so the next render re-requests it.
 */
export function lazyPage(factory) {
  let failed = false;
  const make = () =>
    lazy(() =>
      factory().catch((err) => {
        failed = true;
        failedLoaders.add(reset);
        throw err;
      }),
    );
  let Lazy = make();
  function reset() {
    if (!failed) return;
    failed = false;
    failedLoaders.delete(reset);
    Lazy = make();
  }
  return function LazyPage(props) {
    return createElement(Lazy, props);
  };
}

export function retryFailedPages() {
  [...failedLoaders].forEach((reset) => reset());
}
