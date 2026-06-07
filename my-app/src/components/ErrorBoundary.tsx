import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * App-level error boundary. Catches render-time errors in the tree below it and
 * shows a recoverable fallback instead of a blank white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  private handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Please try again.</p>
          <button type="button" onClick={this.handleReload}>
            Go to homepage
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
