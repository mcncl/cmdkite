// src/content/components/ErrorBoundary/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  errorService,
  ErrorCategory,
  ErrorSeverity,
} from "../../services/errorService";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  errorCategory?: ErrorCategory;
  componentName?: string; // Added to help identify where errors occur
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced Error Boundary component to catch rendering errors in its child component tree
 * and display a fallback UI instead of crashing the entire application.
 * Includes better error reporting and recovery options.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info for more detailed reporting
    this.setState({ errorInfo });

    // Get component name for better error identification
    const componentName = this.props.componentName || "Unknown Component";

    // Log the error to our error service with enhanced context
    errorService.captureException(error, {
      message: `React Error in ${componentName}: ${error.message}`,
      severity: ErrorSeverity.ERROR,
      category: this.props.errorCategory || ErrorCategory.UI,
      context: {
        componentStack: errorInfo.componentStack,
        componentName,
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
      },
    });

    // Call custom onError handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Get custom message if provided
      const errorMessage = this.props.fallbackMessage || "Something went wrong";
      const componentName = this.props.componentName || "component";

      // Default fallback UI with more debugging info
      return (
        <div className="cmd-k-error-boundary">
          <div className="cmd-k-error-message">
            <div className="cmd-k-error-icon">⚠️</div>
            <div className="cmd-k-error-content">
              <h4>{errorMessage}</h4>
              <p>The {componentName} could not be rendered properly.</p>
              {this.state.error && (
                <div className="cmd-k-error-details">
                  <details>
                    <summary>Error Details (for developers)</summary>
                    <pre>{this.state.error.toString()}</pre>
                    {this.state.errorInfo && (
                      <pre className="cmd-k-error-stack">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </details>
                </div>
              )}
              <div className="cmd-k-error-actions">
                <button
                  onClick={this.handleRetry}
                  className="cmd-k-error-retry"
                >
                  Try Again
                </button>
                {/* Add a refresh button as a more aggressive recovery option */}
                <button
                  onClick={() => window.location.reload()}
                  className="cmd-k-error-refresh"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
