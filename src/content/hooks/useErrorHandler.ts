import { useCallback } from "react";
import {
  errorService,
  ErrorSeverity,
  ErrorCategory,
  ExtendedError,
} from "../services/errorService";

interface ErrorHandlerOptions {
  category?: ErrorCategory;
  context?: Record<string, any>;
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler(defaultOptions: ErrorHandlerOptions = {}) {
  /**
   * Handle an error with the error service
   */
  const handleError = useCallback(
    (
      error: Error | unknown,
      message?: string,
      options: {
        severity?: ErrorSeverity;
        category?: ErrorCategory;
        context?: Record<string, any>;
      } = {},
    ): ExtendedError => {
      return errorService.captureException(error, {
        message,
        severity: options.severity || ErrorSeverity.ERROR,
        category:
          options.category || defaultOptions.category || ErrorCategory.UNKNOWN,
        context: {
          ...(defaultOptions.context || {}),
          ...(options.context || {}),
        },
      });
    },
    [defaultOptions],
  );

  /**
   * Create a try/catch wrapper for async functions
   */
  const withErrorHandling = useCallback(
    <T, Args extends any[]>(
      fn: (...args: Args) => Promise<T>,
      options: {
        message?: string;
        severity?: ErrorSeverity;
        category?: ErrorCategory;
        context?: Record<string, any>;
        onError?: (error: ExtendedError) => void;
      } = {},
    ) => {
      return async (...args: Args): Promise<T | undefined> => {
        try {
          return await fn(...args);
        } catch (error) {
          const extendedError = handleError(error, options.message, {
            severity: options.severity,
            category: options.category || defaultOptions.category,
            context: {
              ...(defaultOptions.context || {}),
              ...(options.context || {}),
              args: args.map((arg) =>
                // Try to safely stringify args for context
                typeof arg === "object"
                  ? arg === null
                    ? "null"
                    : arg instanceof Error
                      ? arg.message
                      : "object"
                  : String(arg),
              ),
            },
          });

          if (options.onError) {
            options.onError(extendedError);
          }

          return undefined;
        }
      };
    },
    [handleError, defaultOptions],
  );

  /**
   * Get a user-friendly error message
   */
  const getFriendlyErrorMessage = useCallback(
    (error: Error | ExtendedError | unknown): string => {
      if ((error as ExtendedError).category) {
        return errorService.getUserFriendlyMessage(error as ExtendedError);
      }

      if (error instanceof Error) {
        return error.message || "An unexpected error occurred.";
      }

      return "An unexpected error occurred.";
    },
    [],
  );

  return {
    handleError,
    withErrorHandling,
    getFriendlyErrorMessage,
  };
}
