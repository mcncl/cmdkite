/**
 * Error severity levels
 */
type ErrorSeverity = "info" | "warn" | "error" | "critical";

/**
 * Error service for the background script context.
 * Uses a simpler implementation than the content script since we don't have UI components.
 */
export class BackgroundErrorService {
  private static instance: BackgroundErrorService;
  private errors: Array<{
    message: string;
    severity: ErrorSeverity;
    context?: Record<string, any>;
    timestamp: number;
  }> = [];
  private maxErrorsStored = 50;

  private constructor() {
    // Private constructor to enforce singleton pattern
    this.setupGlobalErrorHandlers();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): BackgroundErrorService {
    if (!BackgroundErrorService.instance) {
      BackgroundErrorService.instance = new BackgroundErrorService();
    }
    return BackgroundErrorService.instance;
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught errors
    self.addEventListener("error", (event) => {
      this.logError(`Uncaught error: ${event.message}`, "error", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Handle unhandled promise rejections
    self.addEventListener("unhandledrejection", (event) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);

      this.logError(`Unhandled promise rejection: ${reason}`, "error", {
        reason: event.reason,
      });
    });
  }

  /**
   * Log an error message
   * @param message Error message
   * @param severity Error severity
   * @param context Additional context
   */
  public logError(
    message: string,
    severity: ErrorSeverity = "error",
    context?: Record<string, any>,
  ): void {
    const error = {
      message,
      severity,
      context,
      timestamp: Date.now(),
    };

    // Store error
    this.errors.unshift(error);

    // Trim error history
    if (this.errors.length > this.maxErrorsStored) {
      this.errors = this.errors.slice(0, this.maxErrorsStored);
    }

    // Log to console
    this.logToConsole(error);
  }

  /**
   * Log an informational message
   */
  public logInfo(message: string, context?: Record<string, any>): void {
    this.logError(message, "info", context);
  }

  /**
   * Log a warning message
   */
  public logWarning(message: string, context?: Record<string, any>): void {
    this.logError(message, "warn", context);
  }

  /**
   * Get all logged errors
   */
  public getErrors(): Array<{
    message: string;
    severity: ErrorSeverity;
    context?: Record<string, any>;
    timestamp: number;
  }> {
    return [...this.errors];
  }

  /**
   * Clear all logged errors
   */
  public clearErrors(): void {
    this.errors = [];
  }

  /**
   * Log to console with appropriate level
   */
  private logToConsole(error: {
    message: string;
    severity: ErrorSeverity;
    context?: Record<string, any>;
    timestamp: number;
  }): void {
    const logPrefix = "[CMDKite]";
    const consoleArgs = [`${logPrefix} ${error.message}`, error.context || {}];

    switch (error.severity) {
      case "info":
        console.info(...consoleArgs);
        break;
      case "warn":
        console.warn(...consoleArgs);
        break;
      case "error":
      case "critical":
        console.error(...consoleArgs);
        break;
      default:
        console.log(...consoleArgs);
    }

    // For critical errors, notify any tabs that might be listening
    if (error.severity === "critical") {
      this.notifyActiveTab(error);
    }
  }

  /**
   * Notify active tab of a critical error
   */
  private async notifyActiveTab(error: {
    message: string;
    severity: ErrorSeverity;
    context?: Record<string, any>;
    timestamp: number;
  }): Promise<void> {
    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (activeTab?.id && activeTab.url?.includes("buildkite.com")) {
        chrome.tabs
          .sendMessage(activeTab.id, {
            action: "background_error",
            error: {
              message: error.message,
              severity: error.severity,
              timestamp: error.timestamp,
            },
          })
          .catch(() => {
            // Ignore errors from sending - tab might not be listening
          });
      }
    } catch (sendError) {
      // Don't log this to avoid potential infinite loops
      console.error("Failed to notify tab of critical error:", sendError);
    }
  }
}
