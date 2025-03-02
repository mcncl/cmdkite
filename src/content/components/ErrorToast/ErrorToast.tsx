import React, { useEffect, useState } from "react";
import { ExtendedError, errorService } from "../../services/errorService";

interface ErrorToastProps {
  error: ExtendedError;
  onClose: () => void;
  autoHideDelay?: number;
}

/**
 * Toast notification for displaying user-friendly error messages
 */
export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onClose,
  autoHideDelay = 5000,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  // Auto-hide after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [autoHideDelay]);

  // Handle animation end
  const handleAnimationEnd = () => {
    if (isExiting) {
      onClose();
    }
  };

  // Get user-friendly message
  const friendlyMessage = errorService.getUserFriendlyMessage(error);

  return (
    <div
      className={`cmd-k-error-toast ${isExiting ? "cmd-k-toast-exit" : ""}`}
      onAnimationEnd={handleAnimationEnd}
      role="alert"
    >
      <div className="cmd-k-error-toast-icon">⚠️</div>
      <div className="cmd-k-error-toast-content">
        <div className="cmd-k-error-toast-title">Error</div>
        <p className="cmd-k-error-toast-message">{friendlyMessage}</p>
      </div>
      <button
        className="cmd-k-error-toast-close"
        onClick={() => setIsExiting(true)}
        aria-label="Close"
        type="button"
      >
        ×
      </button>
    </div>
  );
};
