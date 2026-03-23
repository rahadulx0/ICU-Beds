import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {this.props.title || 'Something went wrong'}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {this.props.message || 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
          <button onClick={this.handleRetry} className="btn-secondary text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
