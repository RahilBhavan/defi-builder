import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorHistoryEntry {
  timestamp: string;
  error: string;
  componentStack: string;
  errorType: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorHistory: ErrorHistoryEntry[];
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorHistory: [],
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorEntry: ErrorHistoryEntry = {
      timestamp: new Date().toISOString(),
      error: error.message,
      componentStack: errorInfo.componentStack || 'No stack trace available',
      errorType: error.name || 'Error',
    };

    const errorHistory = [...this.state.errorHistory, errorEntry].slice(-5); // Keep last 5 errors

    this.setState({
      errorInfo,
      errorHistory,
    });

    // Enhanced logging with context
    console.error('ErrorBoundary caught an error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      timestamp: errorEntry.timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReportError = (): void => {
    // Placeholder for future error reporting service (e.g., Sentry, LogRocket)
    const errorData = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.log('Error report data (would be sent to error reporting service):', errorData);
    
    // In a real implementation, this would send to an error reporting service
    // For now, we'll just log it and show a message
    alert(
      'Error report logged. In production, this would be sent to an error reporting service.'
    );
  };

  getRecoverySuggestions(error: Error | null): string[] {
    if (!error) return [];

    const message = error.message.toLowerCase();
    const suggestions: string[] = [];

    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
    } else if (message.includes('timeout')) {
      suggestions.push('The operation is taking longer than expected');
      suggestions.push('Try again with a simpler strategy');
    } else if (message.includes('memory') || message.includes('out of memory')) {
      suggestions.push('Close other browser tabs to free up memory');
      suggestions.push('Try with a smaller date range');
    } else if (message.includes('worker') || message.includes('web worker')) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Check browser console for more details');
    } else {
      suggestions.push('Try refreshing the page');
      suggestions.push('Check the browser console for more details');
      suggestions.push('If the problem persists, try clearing your browser cache');
    }

    return suggestions;
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const recoverySuggestions = this.getRecoverySuggestions(this.state.error);

      return (
        <div className="fixed inset-0 bg-canvas flex items-center justify-center p-6 z-50">
          <div className="max-w-lg w-full bg-white border-2 border-alert-red p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-alert-red" size={24} />
              <h2 className="text-xl font-bold font-mono uppercase text-ink">
                Something Went Wrong
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4 font-sans">
              An unexpected error occurred. Here are some steps you can try:
            </p>

            {recoverySuggestions.length > 0 && (
              <ul className="list-disc list-inside mb-4 text-sm text-gray-600 space-y-1">
                {recoverySuggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            )}

            {this.state.error && (
              <details className="mb-4">
                <summary className="text-xs text-gray-400 cursor-pointer font-mono mb-2 hover:text-gray-600">
                  Error Details
                </summary>
                <div className="space-y-2">
                  <div className="text-xs bg-gray-100 p-3 rounded font-mono">
                    <div className="font-bold mb-1">Error Type:</div>
                    <div className="text-gray-700 mb-2">{this.state.error.name}</div>
                    <div className="font-bold mb-1">Message:</div>
                    <div className="text-gray-700 mb-2">{this.state.error.message}</div>
                    {this.state.error.stack && (
                      <>
                        <div className="font-bold mb-1">Stack Trace:</div>
                        <pre className="text-[10px] overflow-auto max-h-32 text-gray-600">
                          {this.state.error.stack}
                        </pre>
                      </>
                    )}
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div className="text-xs bg-gray-100 p-3 rounded font-mono">
                      <div className="font-bold mb-1">Component Stack:</div>
                      <pre className="text-[10px] overflow-auto max-h-32 text-gray-600">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {this.state.errorHistory.length > 1 && (
              <details className="mb-4">
                <summary className="text-xs text-gray-400 cursor-pointer font-mono mb-2 hover:text-gray-600">
                  Error History ({this.state.errorHistory.length} errors)
                </summary>
                <div className="text-xs bg-gray-100 p-3 rounded max-h-32 overflow-auto space-y-2">
                  {this.state.errorHistory.map((entry, index) => (
                    <div key={index} className="border-b border-gray-300 pb-2 last:border-0">
                      <div className="font-bold">{entry.errorType}</div>
                      <div className="text-gray-600">{entry.error}</div>
                      <div className="text-gray-400 text-[10px]">{entry.timestamp}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={this.handleReset} variant="secondary">
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
              >
                Reload Page
              </Button>
              <Button
                onClick={this.handleReportError}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <FileText size={16} />
                Report Error
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

