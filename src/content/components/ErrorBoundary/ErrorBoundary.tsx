import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  errorService,
  ErrorCategory,
  ErrorSeverity,
} from "../../services/errorService";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  errorCategory?: ErrorCategory;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch rendering errors in its child component tree
 * and display a fallback UI instead of crashing the entire application.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our error service
    errorService.captureException(error, {
      message: `React Error: ${error.message}`,
      severity: ErrorSeverity.ERROR,
      category: this.props.errorCategory || ErrorCategory.UI,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Call custom onError handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="cmd-k-error-boundary">
          <div className="cmd-k-error-message">
            <div className="cmd-k-error-icon">⚠️</div>
            <div className="cmd-k-error-content">
              <h4>Something went wrong</h4>
              <p>The component could not be rendered properly.</p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="cmd-k-error-retry"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
