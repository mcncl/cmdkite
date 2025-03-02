import {
  ErrorService,
  ErrorSeverity,
  ErrorCategory,
  ExtendedError,
} from "../errorService";

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.log = originalConsole.log;
});

describe("ErrorService", () => {
  let errorService: ErrorService;

  beforeEach(() => {
    // Reset the instance for each test
    // @ts-ignore - Accessing private property for testing
    ErrorService.instance = undefined;
    errorService = ErrorService.getInstance();
  });

  it("should be a singleton", () => {
    const instance1 = ErrorService.getInstance();
    const instance2 = ErrorService.getInstance();
    expect(instance1).toBe(instance2);
  });

  describe("logError", () => {
    it("should log an error with default severity and category", () => {
      const error = errorService.logError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.timestamp).toBeGreaterThan(0);

      expect(console.error).toHaveBeenCalled();
    });

    it("should log an error with specified severity and category", () => {
      const error = errorService.logError(
        "Warning message",
        ErrorSeverity.WARNING,
        ErrorCategory.NETWORK,
      );

      expect(error.message).toBe("Warning message");
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.category).toBe(ErrorCategory.NETWORK);

      expect(console.warn).toHaveBeenCalled();
    });

    it("should include context in the logged error", () => {
      const context = { userId: "123", action: "test" };
      const error = errorService.logError(
        "Error with context",
        ErrorSeverity.ERROR,
        ErrorCategory.UI,
        context,
      );

      expect(error.context).toEqual(context);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[UI]"),
        expect.objectContaining(context),
        undefined, // No original error
      );
    });

    it("should include original error", () => {
      const originalError = new Error("Original error");
      const error = errorService.logError(
        "Wrapped error",
        ErrorSeverity.ERROR,
        ErrorCategory.COMMAND,
        {},
        originalError,
      );

      expect(error.originalError).toBe(originalError);
      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        originalError,
      );
    });

    it("should limit the number of stored errors", () => {
      // @ts-ignore - Access private property for testing
      errorService.maxErrorsStored = 3;

      errorService.logError("Error 1");
      errorService.logError("Error 2");
      errorService.logError("Error 3");
      errorService.logError("Error 4");

      const errors = errorService.getErrors();
      expect(errors.length).toBe(3);
      expect(errors[0].message).toBe("Error 4"); // Most recent first
      expect(errors[2].message).toBe("Error 2"); // Oldest error is dropped
    });
  });

  describe("captureException", () => {
    it("should extract message from Error object", () => {
      const originalError = new Error("Original error message");
      const error = errorService.captureException(originalError);

      expect(error.message).toBe("Original error message");
      expect(error.originalError).toBe(originalError);
    });

    it("should use provided message over error message if specified", () => {
      const originalError = new Error("Original error message");
      const error = errorService.captureException(originalError, {
        message: "Custom message",
      });

      expect(error.message).toBe("Custom message");
    });

    it("should handle non-Error objects", () => {
      const nonError = { code: 500, text: "Server error" };
      const error = errorService.captureException(nonError);

      expect(error.message).toBe("An unknown error occurred");
      expect(error.originalError).toBe(nonError);
    });

    it("should handle string errors", () => {
      const stringError = "Something went wrong";
      const error = errorService.captureException(stringError);

      expect(error.message).toBe("Something went wrong");
      expect(error.originalError).toBe(stringError);
    });
  });

  describe("error listeners", () => {
    it("should notify listeners when an error is logged", () => {
      const listener = jest.fn();
      errorService.addErrorListener(listener);

      const error = errorService.logError("Test error for listener");

      expect(listener).toHaveBeenCalledWith(error);
    });

    it("should allow removing listeners", () => {
      const listener = jest.fn();
      const removeListener = errorService.addErrorListener(listener);

      // First error should trigger listener
      errorService.logError("First test error");
      expect(listener).toHaveBeenCalledTimes(1);

      // Remove listener
      removeListener();

      // Second error should not trigger listener
      errorService.logError("Second test error");
      expect(listener).toHaveBeenCalledTimes(1); // Still just 1 call
    });

    it("should handle errors in listeners", () => {
      // This is to prevent infinite loops if a listener throws
      const buggyListener = jest.fn().mockImplementation(() => {
        throw new Error("Listener error");
      });

      errorService.addErrorListener(buggyListener);

      // This should not throw, but will log to console
      expect(() => {
        errorService.logError("Test error for buggy listener");
      }).not.toThrow();

      expect(buggyListener).toHaveBeenCalled();
    });
  });

  describe("getUserFriendlyMessage", () => {
    it("should return appropriate message for each error category", () => {
      // Test for each category
      Object.values(ErrorCategory).forEach((category) => {
        const error: ExtendedError = {
          message: "Technical error message",
          severity: ErrorSeverity.ERROR,
          category: category as ErrorCategory,
          timestamp: Date.now(),
        };

        const friendlyMessage = errorService.getUserFriendlyMessage(error);
        expect(typeof friendlyMessage).toBe("string");
        expect(friendlyMessage.length).toBeGreaterThan(0);
      });
    });

    it("should have a different message for critical errors", () => {
      const regularError: ExtendedError = {
        message: "Regular error",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.NETWORK,
        timestamp: Date.now(),
      };

      const criticalError: ExtendedError = {
        message: "Critical error",
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.NETWORK,
        timestamp: Date.now(),
      };

      const regularMessage = errorService.getUserFriendlyMessage(regularError);
      const criticalMessage =
        errorService.getUserFriendlyMessage(criticalError);

      expect(regularMessage).not.toEqual(criticalMessage);
      expect(criticalMessage).toContain("refresh");
    });
  });
});
