import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 bg-canvas flex items-center justify-center p-6 z-50">
          <div className="max-w-md w-full bg-white border-2 border-alert-red p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-alert-red" size={24} />
              <h2 className="text-xl font-bold font-mono uppercase text-ink">
                Something Went Wrong
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-2 font-sans">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="text-xs text-gray-400 cursor-pointer font-mono mb-2">
                  Error Details
                </summary>
                <pre className="text-xs bg-gray-100 p-3 overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="secondary">
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

