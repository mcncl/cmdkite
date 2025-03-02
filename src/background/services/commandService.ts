import { BackgroundErrorService } from "./backgroundErrorService";

const activeConnections: Set<chrome.runtime.Port> = new Set();
const errorService = BackgroundErrorService.getInstance();

export class CommandService {
  private readonly handleCommand = async (command: string): Promise<void> => {
    if (command === "toggle-feature") {
      try {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (!activeTab?.id) {
          errorService.logWarning("No active tab found for command", {
            command,
          });
          return;
        }

        if (!activeTab.url?.includes("buildkite.com")) {
          errorService.logInfo("Command ignored: Not on Buildkite domain", {
            command,
            url: activeTab.url,
          });
          return;
        }

        try {
          await chrome.tabs.sendMessage(activeTab.id, {
            action: "toggle_command_box",
          });

          errorService.logInfo("Command box toggled successfully", {
            tabId: activeTab.id,
          });
        } catch (sendError) {
          // This is expected if content script isn't loaded yet
          errorService.logInfo("Content script not ready, injecting", {
            tabId: activeTab.id,
          });

          try {
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ["content.js"],
            });

            await chrome.tabs.sendMessage(activeTab.id, {
              action: "toggle_command_box",
            });

            errorService.logInfo("Command box toggled after script injection", {
              tabId: activeTab.id,
            });
          } catch (scriptError) {
            // This is a more serious error - script injection failed
            errorService.logError("Failed to inject content script", "error", {
              tabId: activeTab.id,
              error:
                scriptError instanceof Error
                  ? scriptError.message
                  : "Unknown error",
            });
          }
        }
      } catch (err) {
        errorService.logError("Error handling command", "error", {
          command,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  };

  public initialize(): void {
    try {
      // Set up port management
      chrome.runtime.onConnect.addListener((port) => {
        try {
          errorService.logInfo("Port connected", { name: port.name });
          activeConnections.add(port);

          port.onDisconnect.addListener(() => {
            try {
              errorService.logInfo("Port disconnected", { name: port.name });
              activeConnections.delete(port);
            } catch (disconnectError) {
              errorService.logError("Error handling port disconnect", "error", {
                name: port.name,
                error:
                  disconnectError instanceof Error
                    ? disconnectError.message
                    : "Unknown error",
              });
            }
          });
        } catch (portError) {
          errorService.logError("Error handling port connection", "error", {
            name: port.name,
            error:
              portError instanceof Error ? portError.message : "Unknown error",
          });
        }
      });

      // Listen for commands
      chrome.commands.onCommand.addListener(this.handleCommand);

      errorService.logInfo("Command service initialized successfully");
    } catch (initError) {
      errorService.logError(
        "Failed to initialize command service",
        "critical",
        {
          error:
            initError instanceof Error ? initError.message : "Unknown error",
        },
      );

      // Re-throw to allow higher-level handling
      throw initError;
    }
  }
}

// Export a singleton instance
export const commandService = new CommandService();
