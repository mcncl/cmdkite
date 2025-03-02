import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ErrorToast } from "../ErrorToast";
import {
  errorService,
  ExtendedError,
  ErrorSeverity,
} from "../../services/errorService";

// Context for error management
interface ErrorContextType {
  showError: (error: ExtendedError) => void;
  clearErrors: () => void;
  errors: ExtendedError[];
}

const ErrorContext = createContext<ErrorContextType>({
  showError: () => {},
  clearErrors: () => {},
  errors: [],
});

interface ErrorProviderProps {
  children: ReactNode;
  maxVisibleErrors?: number;
}

/**
 * Provider component for managing application errors
 */
export const ErrorProvider: React.FC<ErrorProviderProps> = ({
  children,
  maxVisibleErrors = 1,
}) => {
  const [visibleErrors, setVisibleErrors] = useState<ExtendedError[]>([]);

  // Subscribe to error service
  useEffect(() => {
    const unsubscribe = errorService.addErrorListener((error) => {
      // Only show toast for ERROR and CRITICAL severity
      if (
        error.severity === ErrorSeverity.ERROR ||
        error.severity === ErrorSeverity.CRITICAL
      ) {
        showError(error);
      }
    });

    return unsubscribe;
  }, []);

  // Show an error in the toast
  const showError = (error: ExtendedError) => {
    setVisibleErrors((prev) => {
      // Check if error is already visible
      const isDuplicate = prev.some(
        (e) => e.message === error.message && e.category === error.category,
      );

      if (isDuplicate) return prev;

      // Add new error, keeping only the maximum number allowed
      const newErrors = [error, ...prev].slice(0, maxVisibleErrors);
      return newErrors;
    });
  };

  // Clear all visible errors
  const clearErrors = () => {
    setVisibleErrors([]);
  };

  // Handler for closing a specific error
  const handleCloseError = (error: ExtendedError) => {
    setVisibleErrors((prev) => prev.filter((e) => e !== error));
  };

  // Value for the context
  const contextValue: ErrorContextType = {
    showError,
    clearErrors,
    errors: visibleErrors,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}

      {/* Render error toasts */}
      {visibleErrors.map((error, index) => (
        <ErrorToast
          key={`${error.category}-${error.timestamp}-${index}`}
          error={error}
          onClose={() => handleCloseError(error)}
        />
      ))}
    </ErrorContext.Provider>
  );
};

/**
 * Hook for using the error context
 */
export const useErrorContext = () => useContext(ErrorContext);
