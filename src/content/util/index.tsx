import React from "react";
import { createRoot, Root } from "react-dom/client";
import { CommandBox } from "../components/CommandBox";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ErrorProvider } from "../components/ErrorProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import {
  errorService,
  ErrorCategory,
  ErrorSeverity,
} from "../services/errorService";
import { themeService } from "../services/themeService";

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    toggleCommandBox: () => void;
    cmdkiteInitialized: boolean;
  }
}

// Globals for resource management
let root: Root | null = null;
let isProcessingMessage = false;
let port: chrome.runtime.Port | null = null;
let portReconnectTimer: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_DELAY = 2000;

// Cleanup function to remove all instance artifacts
function cleanup(): void {
  // Remove existing elements
  document
    .querySelectorAll("#buildkite-command-box")
    .forEach((el) => el.remove());

  // Cleanup React root
  if (root) {
    root.unmount();
    root = null;
  }

  // Cleanup port
  if (port) {
    port.disconnect();
    port = null;
  }

  // Clear any pending reconnect timer
  if (portReconnectTimer) {
    clearTimeout(portReconnectTimer);
    portReconnectTimer = null;
  }

  // Clean up the theme service
  themeService.dispose();

  // Clear the initialization flag
  window.cmdkiteInitialized = false;
}

const CommandBoxContainer: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(false);

  // Expose toggle function to window
  React.useEffect(() => {
    window.toggleCommandBox = () => {
      setIsVisible((prev) => !prev);
    };

    // Cleanup when component unmounts
    return () => {
      delete window.toggleCommandBox;
    };
  }, []);

  return (
    <ErrorProvider>
      <ThemeProvider>
        <ErrorBoundary
          errorCategory={ErrorCategory.UI}
          fallback={
            <div className="cmd-k-error-boundary">
              <div className="cmd-k-error-message">
                <div className="cmd-k-error-icon">⚠️</div>
                <div className="cmd-k-error-content">
                  <h4>Command Box Error</h4>
                  <p>
                    The command box encountered an error and couldn't be
                    displayed.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="cmd-k-error-retry"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          }
        >
          <CommandBox
            isVisible={isVisible}
            onClose={() => setIsVisible(false)}
          />
        </ErrorBoundary>
      </ThemeProvider>
    </ErrorProvider>
  );
};

function initializeCommandBox(): void {
  try {
    // Import performance monitoring
    const {
      startTiming,
      endTiming,
      PerformanceOperation,
    } = require("./performanceMonitor");
    const { applyAllCSSFixes } = require("./cssUpdates");

    // Start timing initialization
    startTiming(PerformanceOperation.UI_INTERACTION);

    // Prevent multiple initializations
    if (window.cmdkiteInitialized) {
      console.log("CMDKite already initialized, skipping");
      endTiming(PerformanceOperation.UI_INTERACTION);
      return;
    }

    // Set initialization flag
    window.cmdkiteInitialized = true;

    // Cleanup any existing instances
    cleanup();

    // Apply CSS fixes
    applyAllCSSFixes();

    // Create container
    const container = document.createElement("div");
    container.id = "buildkite-command-box";

    // Don't add any CSS that would block interaction when inactive
    document.body.appendChild(container);

    // Create React root and render with error handling
    try {
      root = createRoot(container);

      // Use ErrorBoundary at the highest level
      root.render(
        <React.StrictMode>
          <ErrorBoundary
            componentName="CommandBoxContainer"
            errorCategory={ErrorCategory.UI}
            fallbackMessage="The command box couldn't be initialized properly"
          >
            <CommandBoxContainer />
          </ErrorBoundary>
        </React.StrictMode>,
      );

      // Initialize theme service
      themeService.initialize().catch((error) => {
        errorService.captureException(error, {
          message: "Failed to initialize theme service",
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.INITIALIZATION,
        });
      });

      // Initialize port connection
      connectToServiceWorker();

      // Record initialization time and mark complete
      endTiming(PerformanceOperation.UI_INTERACTION, 200);
      console.log("CMDKite initialized successfully");

      // Import debugger
      import("./debug").catch((err) =>
        console.warn("Could not load debugger:", err),
      );
    } catch (renderError) {
      errorService.captureException(renderError, {
        message: "React render failed",
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.UI,
      });

      // Clean up if render fails
      cleanup();

      // Record failed initialization
      endTiming(PerformanceOperation.UI_INTERACTION);
    }
  } catch (error) {
    // Log initialization error
    errorService.captureException(error, {
      message: "Failed to initialize command box",
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.INITIALIZATION,
    });

    // Try to clean up after failed initialization
    cleanup();
  }
}

function connectToServiceWorker(): void {
  if (portReconnectTimer) {
    clearTimeout(portReconnectTimer);
    portReconnectTimer = null;
  }

  try {
    // Close existing port if any
    if (port) {
      port.disconnect();
      port = null;
    }

    // Create new port
    port = chrome.runtime.connect({ name: "content-keepalive" });

    port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      if (error) {
        errorService.logError(
          `Port disconnected: ${error.message || "Unknown error"}`,
          ErrorSeverity.WARNING,
          ErrorCategory.INITIALIZATION,
        );
      }

      port = null;
      // Only attempt reconnect if we're not in cleanup
      if (window.cmdkiteInitialized) {
        portReconnectTimer = setTimeout(
          connectToServiceWorker,
          RECONNECT_DELAY,
        );
      }
    });
  } catch (error) {
    errorService.captureException(error, {
      message: "Failed to connect to service worker",
      severity: ErrorSeverity.WARNING,
      category: ErrorCategory.INITIALIZATION,
    });

    // Only attempt reconnect if we're not in cleanup
    if (window.cmdkiteInitialized) {
      portReconnectTimer = setTimeout(connectToServiceWorker, RECONNECT_DELAY);
    }
  }
}

// Initialize on DOM load with safeguards
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.cmdkiteInitialized) {
      initializeCommandBox();
    }
  });
} else {
  if (!window.cmdkiteInitialized) {
    initializeCommandBox();
  }
}

// Cleanup on navigation
window.addEventListener("beforeunload", cleanup);

// Listen for messages from background script
chrome.runtime.onMessage.addListener(
  (
    request: { action: string },
    _sender,
    sendResponse: (response: { success: boolean; error?: string }) => void,
  ) => {
    try {
      if (request.action === "toggle_command_box" && !isProcessingMessage) {
        isProcessingMessage = true;

        // Ensure we have a working instance
        if (!window.cmdkiteInitialized) {
          initializeCommandBox();

          // Small delay to ensure the toggleCommandBox function is registered
          setTimeout(() => {
            if (window.toggleCommandBox) {
              window.toggleCommandBox();
            }
            sendResponse({ success: true });
            isProcessingMessage = false;
          }, 100);
        } else {
          // Toggle immediately if already initialized
          if (window.toggleCommandBox) {
            window.toggleCommandBox();
          }
          sendResponse({ success: true });

          // Reset the processing flag after a short delay
          setTimeout(() => {
            isProcessingMessage = false;
          }, 100);
        }
      } else {
        sendResponse({
          success: false,
          error: "Action not recognized or message is already being processed",
        });
      }
    } catch (error) {
      errorService.captureException(error, {
        message: "Error handling message",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.INITIALIZATION,
        context: { action: request.action },
      });

      // Send error response
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      isProcessingMessage = false;
    }

    return true; // Keep the message channel open for async response
  },
);
