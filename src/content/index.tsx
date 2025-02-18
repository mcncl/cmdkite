import React from "react";
import { createRoot, Root } from "react-dom/client";
import { CommandBox as CommandBoxComponent } from "./components/CommandBox";
import { styles } from "./styles";

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    toggleCommandBox: () => void;
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
  document
    .querySelectorAll("#buildkite-command-styles")
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
}

const CommandBoxContainer: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(false);

  // Expose toggle function to window
  React.useEffect(() => {
    window.toggleCommandBox = () => {
      setIsVisible((prev) => !prev);
    };
  }, []);

  return (
    <CommandBoxComponent
      isVisible={isVisible}
      onClose={() => setIsVisible(false)}
    />
  );
};

function initializeCommandBox(): void {
  // Cleanup any existing instances
  cleanup();

  // Add styles
  const styleElement = document.createElement("style");
  styleElement.id = "buildkite-command-styles";
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  // Create container
  const container = document.createElement("div");
  container.id = "buildkite-command-box";

  // Critical change: Don't add any CSS that would block interaction when inactive
  document.body.appendChild(container);

  // Create React root and render
  root = createRoot(container);
  root.render(
    <React.StrictMode>
      <CommandBoxContainer />
    </React.StrictMode>,
  );

  // Initialize port connection
  connectToServiceWorker();
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
      port = null;
      // Only attempt reconnect if we're not in cleanup
      if (root) {
        portReconnectTimer = setTimeout(
          connectToServiceWorker,
          RECONNECT_DELAY,
        );
      }
    });
  } catch (error) {
    // Only attempt reconnect if we're not in cleanup
    if (root) {
      portReconnectTimer = setTimeout(connectToServiceWorker, RECONNECT_DELAY);
    }
  }
}

// Initialize on DOM load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCommandBox);
} else {
  initializeCommandBox();
}

// Cleanup on navigation
window.addEventListener("beforeunload", cleanup);

// Listen for messages from background script
chrome.runtime.onMessage.addListener(
  (
    request: { action: string },
    _sender,
    sendResponse: (response: { success: boolean }) => void,
  ) => {
    if (request.action === "toggle_command_box" && !isProcessingMessage) {
      isProcessingMessage = true;

      // Ensure we have a working instance
      if (!root) {
        initializeCommandBox();
      }

      window.toggleCommandBox();
      sendResponse({ success: true });

      // Reset the processing flag after a short delay
      setTimeout(() => {
        isProcessingMessage = false;
      }, 100);
    }
    return true;
  },
);
