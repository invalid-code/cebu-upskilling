import { Component } from 'react';
import ErrorState from '../ui/ErrorState';

/**
 * Catches errors (notably failed lazy chunk loads) from the routed page only. The shell and the
 * current URL stay intact, so the user remains on the current page and state held outside the
 * failed subtree is preserved. Retry re-attempts the load.
 */
export default class ChunkErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  retry = () => {
    this.props.onRetry?.();
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="This page could not be loaded"
          error="This page could not be loaded. Check your connection and try again."
          onRetry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}
