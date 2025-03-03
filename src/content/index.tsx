import React from "react";
import { createRoot } from "react-dom/client";
import { CommandBox } from "./components/CommandBox";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorProvider } from "./components/ErrorProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { errorService, ErrorCategory } from "./services/errorService";
import {
  enablePerformanceMonitoring,
  PerformanceOperation,
  startTiming,
  endTiming,
} from "./util/performanceMonitor";

// Set up initial extension scaffold
startTiming(PerformanceOperation.UI_INTERACTION);

// Enable performance monitoring in development or when explicitly enabled
// Check for development environment or the presence of a debug flag
const isDevelopment = process.env.NODE_ENV === "development";
const debugFlagExists = localStorage.getItem("cmdkite_debug") === "true";

if (isDevelopment || debugFlagExists) {
  enablePerformanceMonitoring(true);
  console.log(
    "CMDKite: Development mode or debug flag detected, enabling performance monitoring",
  );
}

// Initialize the container only once when the script loads
// instead of waiting for DOM content loaded event
document.addEventListener("DOMContentLoaded", () => {
  console.log("CMDKite: Content script initialized");
  // Actual initialization happens in util/index.tsx
  endTiming(PerformanceOperation.UI_INTERACTION, 100);
});

// Export initialization marker for consistency in testing
export const CMDKITE_INITIALIZED = true;
