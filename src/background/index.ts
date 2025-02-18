import { commandService } from "./services/commandService";

// Initialize command service
commandService.initialize();

// Keep service worker active by responding to any messages
chrome.runtime.onMessage.addListener(
  (
    message: { type?: string },
    _sender,
    sendResponse: (response: { type?: string; received?: boolean }) => void,
  ) => {
    if (message.type === "ping") {
      sendResponse({ type: "pong" });
    } else {
      sendResponse({ received: true });
    }
  },
);
