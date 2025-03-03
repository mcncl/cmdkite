import {
  enablePerformanceMonitoring,
  logPerformanceMetrics,
  resetPerformanceMetrics,
} from "./performanceMonitor";
import { errorService } from "../services/errorService";

/**
 * CMDKite debugging helper for troubleshooting in production environments
 */
class CMDKiteDebugger {
  // Track whether debugging is enabled
  private enabled = false;

  /**
   * Initialize the debugger with global window access
   */
  constructor() {
    this.setupGlobalAccess();
  }

  /**
   * Enable debugging features
   */
  public enable(): void {
    if (this.enabled) return;

    this.enabled = true;
    localStorage.setItem("cmdkite_debug", "true");
    enablePerformanceMonitoring(true);
    console.log("CMDKite Debugger: Enabled");

    // Log current state
    this.logState();
  }

  /**
   * Disable debugging features
   */
  public disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    localStorage.removeItem("cmdkite_debug");
    enablePerformanceMonitoring(false);
    console.log("CMDKite Debugger: Disabled");
  }

  /**
   * Log the current state of CMDKite
   */
  public logState(): void {
    console.group("CMDKite Debugger: Current State");

    // Log initialization status
    console.log("Initialized:", window.cmdkiteInitialized || false);

    // Log command box status
    console.log(
      "Command Box Toggle Function:",
      typeof window.toggleCommandBox === "function"
        ? "Available"
        : "Not Available",
    );

    // Log error history
    console.log("Recent Errors:", errorService.getErrors().slice(0, 5));

    // Log performance metrics if enabled
    if (this.enabled) {
      logPerformanceMetrics();
    }

    console.groupEnd();
  }

  /**
   * Reset any debugger state
   */
  public reset(): void {
    resetPerformanceMetrics();
    console.log("CMDKite Debugger: Metrics reset");
  }

  /**
   * Force initialization of the command box
   */
  public forceInit(): void {
    console.log("CMDKite Debugger: Forcing reinitialization");

    // Clear initialization flag
    window.cmdkiteInitialized = false;

    // Clean up any existing elements
    document
      .querySelectorAll("#buildkite-command-box")
      .forEach((el) => el.remove());

    // Try to run the initialization function if available
    try {
      // Dynamic import to avoid circular dependencies
      import("../util/index").then((module) => {
        const initFn = module["initializeCommandBox"];
        if (typeof initFn === "function") {
          initFn();
          console.log("CMDKite Debugger: Reinitialization complete");
        } else {
          console.error(
            "CMDKite Debugger: Could not find initialization function",
          );
        }
      });
    } catch (error) {
      console.error("CMDKite Debugger: Reinitialization failed", error);
    }
  }

  /**
   * Expose debugger functions to the global window object
   */
  private setupGlobalAccess(): void {
    if (typeof window !== "undefined") {
      // Create a namespace for our debugging tools
      (window as any).CMDKiteDebug = {
        enable: this.enable.bind(this),
        disable: this.disable.bind(this),
        logState: this.logState.bind(this),
        reset: this.reset.bind(this),
        forceInit: this.forceInit.bind(this),
      };

      console.log(
        "CMDKite Debugger: Available in console via window.CMDKiteDebug",
      );
    }
  }
}

// Initialize debugger
const kitedebugger = new CMDKiteDebugger();

// Check if debugging was previously enabled
if (localStorage.getItem("cmdkite_debug") === "true") {
  kitedebugger.enable();
}

export default kitedebugger;
