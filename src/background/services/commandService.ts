const activeConnections: Set<chrome.runtime.Port> = new Set();

export class CommandService {
  private readonly handleCommand = async (command: string): Promise<void> => {
    if (command === "toggle-feature") {
      try {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (!activeTab?.id) return;
        if (!activeTab.url?.includes("buildkite.com")) return;

        try {
          await chrome.tabs.sendMessage(activeTab.id, {
            action: "toggle_command_box",
          });
        } catch (err) {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["content.js"],
          });
          await chrome.tabs.sendMessage(activeTab.id, {
            action: "toggle_command_box",
          });
        }
      } catch (err) {
        console.error("Error handling command:", err);
      }
    }
  };

  public initialize(): void {
    // Set up port management
    chrome.runtime.onConnect.addListener((port) => {
      console.log("Port connected:", port.name);
      activeConnections.add(port);

      port.onDisconnect.addListener(() => {
        console.log("Port disconnected:", port.name);
        activeConnections.delete(port);
      });
    });

    // Listen for commands
    chrome.commands.onCommand.addListener(this.handleCommand);
  }
}

// Export a singleton instance
export const commandService = new CommandService();
