import { userPreferencesService } from "./preferences";
import { errorService, ErrorCategory, ErrorSeverity } from "./errorService";

/**
 * Available theme options for the application
 */
export type Theme = "light" | "dark" | "system";

/**
 * Specific theme mode (actual applied theme after system preference is considered)
 */
export type ThemeMode = "light" | "dark";

/**
 * Events that can be listened to from the theme service
 */
export type ThemeEvent = "themeChanged";

// CSS variable names for theme colors
const CSS_VARS = {
  // Background colors
  bgPrimary: "--cmd-k-bg-primary",
  bgSecondary: "--cmd-k-bg-secondary",
  bgTertiary: "--cmd-k-bg-tertiary",
  bgSelected: "--cmd-k-bg-selected",
  bgHover: "--cmd-k-bg-hover",
  bgOverlay: "--cmd-k-bg-overlay",

  // Text colors
  textPrimary: "--cmd-k-text-primary",
  textSecondary: "--cmd-k-text-secondary",
  textTertiary: "--cmd-k-text-tertiary",
  textInverted: "--cmd-k-text-inverted",

  // Border colors
  borderPrimary: "--cmd-k-border-primary",
  borderSecondary: "--cmd-k-border-secondary",
  borderFocus: "--cmd-k-border-focus",

  // Accent colors
  accentPrimary: "--cmd-k-accent-primary",
  accentSecondary: "--cmd-k-accent-secondary",
  accentTertiary: "--cmd-k-accent-tertiary",

  // Status colors
  success: "--cmd-k-success",
  warning: "--cmd-k-warning",
  error: "--cmd-k-error",
  info: "--cmd-k-info",

  // Shadow and effects
  shadowPrimary: "--cmd-k-shadow-primary",
  shadowSecondary: "--cmd-k-shadow-secondary",

  // Animation durations
  animationFast: "--cmd-k-animation-fast",
  animationNormal: "--cmd-k-animation-normal",
  animationSlow: "--cmd-k-animation-slow",

  // Border radius
  radiusSmall: "--cmd-k-radius-small",
  radiusMedium: "--cmd-k-radius-medium",
  radiusLarge: "--cmd-k-radius-large",

  // Spacing
  spacingXs: "--cmd-k-spacing-xs",
  spacingSm: "--cmd-k-spacing-sm",
  spacingMd: "--cmd-k-spacing-md",
  spacingLg: "--cmd-k-spacing-lg",
  spacingXl: "--cmd-k-spacing-xl",
};

// Define color schemes
const THEMES = {
  light: {
    // Background colors
    [CSS_VARS.bgPrimary]: "#ffffff",
    [CSS_VARS.bgSecondary]: "#f9f9f9",
    [CSS_VARS.bgTertiary]: "#f0f0f0",
    [CSS_VARS.bgSelected]: "#ebf5ff",
    [CSS_VARS.bgHover]: "#f5f9ff",
    [CSS_VARS.bgOverlay]: "rgba(0, 0, 0, 0.4)",

    // Text colors
    [CSS_VARS.textPrimary]: "#333333",
    [CSS_VARS.textSecondary]: "#666666",
    [CSS_VARS.textTertiary]: "#999999",
    [CSS_VARS.textInverted]: "#ffffff",

    // Border colors
    [CSS_VARS.borderPrimary]: "#e1e1e1",
    [CSS_VARS.borderSecondary]: "#eaeaea",
    [CSS_VARS.borderFocus]: "#2563eb",

    // Accent colors
    [CSS_VARS.accentPrimary]: "#2563eb",
    [CSS_VARS.accentSecondary]: "#3b82f6",
    [CSS_VARS.accentTertiary]: "#93c5fd",

    // Status colors
    [CSS_VARS.success]: "#10b981",
    [CSS_VARS.warning]: "#f59e0b",
    [CSS_VARS.error]: "#dc2626",
    [CSS_VARS.info]: "#0ea5e9",

    // Shadow and effects
    [CSS_VARS.shadowPrimary]: "0 8px 24px rgba(0, 0, 0, 0.15)",
    [CSS_VARS.shadowSecondary]: "0 4px 12px rgba(0, 0, 0, 0.1)",
  },
  dark: {
    // Background colors
    [CSS_VARS.bgPrimary]: "#252525",
    [CSS_VARS.bgSecondary]: "#2d2d2d",
    [CSS_VARS.bgTertiary]: "#333333",
    [CSS_VARS.bgSelected]: "#2d3748",
    [CSS_VARS.bgHover]: "#323b4c",
    [CSS_VARS.bgOverlay]: "rgba(0, 0, 0, 0.6)",

    // Text colors
    [CSS_VARS.textPrimary]: "#f0f0f0",
    [CSS_VARS.textSecondary]: "#b0b0b0",
    [CSS_VARS.textTertiary]: "#808080",
    [CSS_VARS.textInverted]: "#333333",

    // Border colors
    [CSS_VARS.borderPrimary]: "#494949",
    [CSS_VARS.borderSecondary]: "#3d3d3d",
    [CSS_VARS.borderFocus]: "#3b82f6",

    // Accent colors
    [CSS_VARS.accentPrimary]: "#3b82f6",
    [CSS_VARS.accentSecondary]: "#4f96ff",
    [CSS_VARS.accentTertiary]: "#1e3a8a",

    // Status colors
    [CSS_VARS.success]: "#10b981",
    [CSS_VARS.warning]: "#f59e0b",
    [CSS_VARS.error]: "#ef4444",
    [CSS_VARS.info]: "#0ea5e9",

    // Shadow and effects
    [CSS_VARS.shadowPrimary]: "0 8px 24px rgba(0, 0, 0, 0.35)",
    [CSS_VARS.shadowSecondary]: "0 4px 12px rgba(0, 0, 0, 0.25)",
  },
};

// Constant theme values that are the same for both light and dark modes
const CONSTANT_VARS = {
  // Animation durations
  [CSS_VARS.animationFast]: "0.15s",
  [CSS_VARS.animationNormal]: "0.25s",
  [CSS_VARS.animationSlow]: "0.4s",

  // Border radius
  [CSS_VARS.radiusSmall]: "4px",
  [CSS_VARS.radiusMedium]: "8px",
  [CSS_VARS.radiusLarge]: "12px",

  // Spacing
  [CSS_VARS.spacingXs]: "4px",
  [CSS_VARS.spacingSm]: "8px",
  [CSS_VARS.spacingMd]: "16px",
  [CSS_VARS.spacingLg]: "24px",
  [CSS_VARS.spacingXl]: "32px",
};

/**
 * Service for managing application theming
 */
export class ThemeService {
  private static instance: ThemeService;
  private currentTheme: Theme = "system";
  private currentMode: ThemeMode = "light";
  private eventListeners: Map<ThemeEvent, Array<(...args: any[]) => void>> =
    new Map();
  private initialized = false;
  private styleElement: HTMLStyleElement | null = null;

  private constructor() {
    // Initialize event listeners map
    this.eventListeners.set("themeChanged", []);

    // Apply constant CSS variables
    this.applyConstantVariables();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Initialize theme service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load saved theme preference
      const savedTheme = await userPreferencesService.getTheme();
      this.currentTheme = savedTheme;

      // Set up system theme detection
      this.setupSystemThemeDetection();

      // Apply theme based on current settings
      this.applyTheme();

      this.initialized = true;
    } catch (error) {
      errorService.captureException(error, {
        message: "Failed to initialize theme service",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.INITIALIZATION,
      });

      // Fall back to system theme
      this.currentTheme = "system";
      this.applyTheme();
    }
  }

  /**
   * Get the current theme setting
   */
  public getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Get the effective theme mode (light/dark) after system preference is considered
   */
  public getThemeMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * Set the theme
   * @param theme The theme to set
   */
  public async setTheme(theme: Theme): Promise<void> {
    try {
      if (theme === this.currentTheme) {
        return;
      }

      this.currentTheme = theme;

      // Save theme preference
      await userPreferencesService.setTheme(theme);

      // Apply the theme
      this.applyTheme();

      // Notify listeners
      this.notifyListeners("themeChanged", theme, this.currentMode);
    } catch (error) {
      errorService.captureException(error, {
        message: "Failed to set theme",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.UI,
        context: { theme },
      });
    }
  }

  /**
   * Add an event listener
   * @param event The event to listen for
   * @param listener The listener function
   * @returns Function to remove the listener
   */
  public addEventListener(
    event: ThemeEvent,
    listener: (...args: any[]) => void,
  ): () => void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);

    // Return function to remove the listener
    return () => {
      const updatedListeners = this.eventListeners.get(event) || [];
      const index = updatedListeners.indexOf(listener);
      if (index !== -1) {
        updatedListeners.splice(index, 1);
        this.eventListeners.set(event, updatedListeners);
      }
    };
  }

  /**
   * Apply the current theme
   */
  private applyTheme(): void {
    // Determine effective mode based on system preference if needed
    if (this.currentTheme === "system") {
      this.currentMode = this.getSystemThemePreference();
    } else {
      this.currentMode = this.currentTheme;
    }

    // Apply theme variables
    this.applyThemeVariables(this.currentMode);

    // Add theme class to body
    document.documentElement.setAttribute("data-theme", this.currentMode);
  }

  /**
   * Get the system theme preference
   */
  private getSystemThemePreference(): ThemeMode {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  /**
   * Set up detection of system theme changes
   */
  private setupSystemThemeDetection(): void {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      // Modern browsers
      try {
        // Use addEventListener when available (newer browsers)
        mediaQuery.addEventListener("change", this.handleSystemThemeChange);
      } catch (e) {
        try {
          // Fallback for older browsers
          mediaQuery.addListener(this.handleSystemThemeChange);
        } catch (error) {
          // If all fails, log the error but continue
          errorService.logError(
            "Could not set up system theme detection",
            ErrorSeverity.WARNING,
            ErrorCategory.UI,
          );
        }
      }
    }
  }

  /**
   * Handle changes to the system theme
   */
  private handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    // Only update if we're using system theme
    if (this.currentTheme === "system") {
      this.currentMode = event.matches ? "dark" : "light";
      this.applyTheme();
      this.notifyListeners("themeChanged", this.currentTheme, this.currentMode);
    }
  };

  /**
   * Apply theme variables to the document
   */
  private applyThemeVariables(mode: ThemeMode): void {
    // Create style element if needed
    if (!this.styleElement) {
      this.styleElement = document.createElement("style");
      this.styleElement.id = "cmd-k-theme-vars";
      document.head.appendChild(this.styleElement);
    }

    // Get the theme variables
    const themeVars = THEMES[mode];

    // Build CSS string
    let css = ":root {\n";

    // Add theme-specific variables
    Object.entries(themeVars).forEach(([key, value]) => {
      css += `  ${key}: ${value};\n`;
    });

    // Close the CSS rule
    css += "}\n";

    // Set the CSS content
    this.styleElement.textContent = css;
  }

  /**
   * Apply constant CSS variables that don't change with theme
   */
  private applyConstantVariables(): void {
    // Create style element
    const styleElement = document.createElement("style");
    styleElement.id = "cmd-k-constant-vars";

    // Build CSS string
    let css = ":root {\n";

    // Add constant variables
    Object.entries(CONSTANT_VARS).forEach(([key, value]) => {
      css += `  ${key}: ${value};\n`;
    });

    // Close the CSS rule
    css += "}\n";

    // Set the CSS content
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: ThemeEvent, ...args: any[]): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        errorService.logError(
          "Error in theme event listener",
          ErrorSeverity.ERROR,
          ErrorCategory.UI,
          { event, error },
        );
      }
    });
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove media query listener
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      try {
        mediaQuery.removeEventListener("change", this.handleSystemThemeChange);
      } catch (e) {
        try {
          mediaQuery.removeListener(this.handleSystemThemeChange);
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    }

    // Remove theme style elements
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    const constantStyleElement = document.getElementById("cmd-k-constant-vars");
    if (constantStyleElement) {
      constantStyleElement.remove();
    }

    // Clear event listeners
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const themeService = ThemeService.getInstance();
