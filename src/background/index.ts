import { commandService } from "./services/commandService";
import { BackgroundErrorService } from "./services/backgroundErrorService";

// Initialize error service first for proper logging
const errorService = BackgroundErrorService.getInstance();

try {
  // Initialize command service
  commandService.initialize();

  // Keep service worker active by responding to any messages
  chrome.runtime.onMessage.addListener(
    (
      message: { type?: string },
      _sender,
      sendResponse: (response: {
        type?: string;
        received?: boolean;
        error?: string;
      }) => void,
    ) => {
      try {
        if (message.type === "ping") {
          sendResponse({ type: "pong" });
        } else {
          sendResponse({ received: true });
        }
      } catch (error) {
        // Log error
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errorService.logError("Error handling message", "error", {
          message,
          error: errorMessage,
        });

        // Send error response
        sendResponse({ received: false, error: errorMessage });
      }
    },
  );

  // Listen for errors from content scripts
  chrome.runtime.onMessage.addListener(
    (
      message: { type?: string; error?: any },
      sender,
      sendResponse: (response: { received: boolean }) => void,
    ) => {
      if (message.type === "log_error" && message.error) {
        const senderInfo = sender.tab
          ? `Tab ${sender.tab.id} (${sender.tab.url})`
          : "Unknown sender";

        errorService.logError("Error from content script", "error", {
          error: message.error,
          sender: senderInfo,
        });

        sendResponse({ received: true });
      }

      return true;
    },
  );

  // Log successful initialization
  errorService.logInfo("Background script initialized successfully");
} catch (error) {
  // Log critical initialization error
  errorService.logError("Failed to initialize background script", "critical", {
    error: error instanceof Error ? error.message : "Unknown error",
  });
}
