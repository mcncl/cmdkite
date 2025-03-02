/**
 * Error severity levels for categorizing errors
 */
export enum ErrorSeverity {
  INFO = "info", // Non-critical information that doesn't affect functionality
  WARNING = "warn", // Potential issues that don't prevent core functionality
  ERROR = "error", // Errors that affect specific functionality but don't crash the app
  CRITICAL = "critical", // Severe errors that prevent core functionality
}

/**
 * Error category types for grouping similar errors
 */
export enum ErrorCategory {
  NETWORK = "network", // Network/API related errors
  COMMAND = "command", // Command execution errors
  PIPELINE = "pipeline", // Pipeline-related errors
  UI = "ui", // UI rendering errors
  STORAGE = "storage", // Storage/persistence errors
  INITIALIZATION = "init", // Startup/initialization errors
  NAVIGATION = "navigation", // Navigation-related errors
  UNKNOWN = "unknown", // Uncategorized errors
}

/**
 * Extended error interface with additional metadata
 */
export interface ExtendedError {
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  originalError?: Error | unknown;
  context?: Record<string, any>;
  timestamp: number;
}

/**
 * Central service for handling and logging errors throughout the application
 */
export class ErrorService {
  private static instance: ErrorService;
  private errors: ExtendedError[] = [];
  private maxErrorsStored = 50;
  private errorListeners: Array<(error: ExtendedError) => void> = [];

  private constructor() {
    // Private constructor to enforce singleton pattern
    window.addEventListener("error", (event) => {
      this.captureException(event.error, {
        message: event.message,
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.UNKNOWN,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.captureException(event.reason, {
        message: "Unhandled Promise Rejection",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.UNKNOWN,
      });
    });
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Log an error with the specified details
   */
  public logError(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: Record<string, any>,
    originalError?: Error | unknown,
  ): ExtendedError {
    const extendedError: ExtendedError = {
      message,
      severity,
      category,
      context,
      originalError,
      timestamp: Date.now(),
    };

    // Add to error history
    this.errors.unshift(extendedError);

    // Trim error history to max size
    if (this.errors.length > this.maxErrorsStored) {
      this.errors = this.errors.slice(0, this.maxErrorsStored);
    }

    // Log to console with appropriate level
    this.logToConsole(extendedError);

    // Notify listeners
    this.notifyListeners(extendedError);

    return extendedError;
  }

  /**
   * Capture and log an exception
   */
  public captureException(
    error: Error | unknown,
    options: {
      message?: string;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: Record<string, any>;
    } = {},
  ): ExtendedError {
    let errorMessage = options.message || "An unknown error occurred";

    // Extract message from error if available
    if (error instanceof Error) {
      errorMessage = options.message || error.message;
    } else if (typeof error === "string") {
      errorMessage = options.message || error;
    }

    return this.logError(
      errorMessage,
      options.severity || ErrorSeverity.ERROR,
      options.category || ErrorCategory.UNKNOWN,
      options.context,
      error,
    );
  }

  /**
   * Get recent errors
   */
  public getErrors(): ExtendedError[] {
    return [...this.errors];
  }

  /**
   * Clear stored errors
   */
  public clearErrors(): void {
    this.errors = [];
  }

  /**
   * Add an error listener
   */
  public addErrorListener(
    listener: (error: ExtendedError) => void,
  ): () => void {
    this.errorListeners.push(listener);
    // Return a function to remove the listener
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Log to console with appropriate level
   */
  private logToConsole(error: ExtendedError): void {
    const consoleArgs = [
      `[${error.category.toUpperCase()}] ${error.message}`,
      error.context || {},
    ];

    if (error.originalError) {
      consoleArgs.push(error.originalError);
    }

    switch (error.severity) {
      case ErrorSeverity.INFO:
        console.info(...consoleArgs);
        break;
      case ErrorSeverity.WARNING:
        console.warn(...consoleArgs);
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        console.error(...consoleArgs);
        break;
      default:
        console.log(...consoleArgs);
    }
  }

  /**
   * Notify all error listeners
   */
  private notifyListeners(error: ExtendedError): void {
    this.errorListeners.forEach((listener) => {
      try {
        listener(error);
      } catch (listenerError) {
        // Avoid infinite loops if a listener throws
        console.error("Error in error listener:", listenerError);
      }
    });
  }

  /**
   * Get a user-friendly error message based on error details
   */
  public getUserFriendlyMessage(error: ExtendedError): string {
    // Default friendly messages by category
    const defaultMessages: Record<ErrorCategory, string> = {
      [ErrorCategory.NETWORK]:
        "Unable to connect. Please check your network connection.",
      [ErrorCategory.COMMAND]: "There was a problem executing the command.",
      [ErrorCategory.PIPELINE]: "Unable to retrieve pipeline information.",
      [ErrorCategory.UI]: "There was a display issue. Please try again.",
      [ErrorCategory.STORAGE]: "Unable to save your preferences.",
      [ErrorCategory.INITIALIZATION]:
        "The extension had trouble starting. Please refresh the page.",
      [ErrorCategory.NAVIGATION]: "Navigation failed. Please try again.",
      [ErrorCategory.UNKNOWN]: "An unexpected error occurred.",
    };

    // For critical errors, provide more urgent messaging
    if (error.severity === ErrorSeverity.CRITICAL) {
      return `Something went wrong. Please refresh the page to continue. (${error.category})`;
    }

    // For non-critical errors, provide more specific messaging
    return defaultMessages[error.category] || "An unexpected error occurred.";
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance();
