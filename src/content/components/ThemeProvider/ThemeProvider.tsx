import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { themeService, Theme, ThemeMode } from "../../services/themeService";
import { useErrorHandler } from "../../hooks";

// Theme context interface
interface ThemeContextProps {
  theme: Theme;
  themeMode: ThemeMode;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextProps>({
  theme: "system",
  themeMode: "light",
  setTheme: async () => {},
  toggleTheme: async () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Provider component for theme management
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(themeService.getTheme());
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    themeService.getThemeMode(),
  );
  const { handleError } = useErrorHandler();

  // Initialize theme service
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        await themeService.initialize();

        // Update state with initial values
        setThemeState(themeService.getTheme());
        setThemeMode(themeService.getThemeMode());
      } catch (error) {
        handleError(error, "Failed to initialize theme");
      }
    };

    initializeTheme();
  }, [handleError]);

  // Listen for theme changes
  useEffect(() => {
    const unsubscribe = themeService.addEventListener(
      "themeChanged",
      (newTheme: Theme, newMode: ThemeMode) => {
        setThemeState(newTheme);
        setThemeMode(newMode);
      },
    );

    return unsubscribe;
  }, []);

  // Set theme handler
  const handleSetTheme = async (newTheme: Theme) => {
    try {
      await themeService.setTheme(newTheme);
    } catch (error) {
      handleError(error, "Failed to set theme");
    }
  };

  // Toggle between light and dark theme
  const toggleTheme = async () => {
    try {
      const currentTheme = themeService.getTheme();
      const currentMode = themeService.getThemeMode();

      if (currentTheme === "system") {
        // If currently using system, switch to opposite of current mode
        await themeService.setTheme(currentMode === "light" ? "dark" : "light");
      } else {
        // If not using system, toggle between light and dark
        await themeService.setTheme(
          currentTheme === "light" ? "dark" : "light",
        );
      }
    } catch (error) {
      handleError(error, "Failed to toggle theme");
    }
  };

  // Context value
  const contextValue: ThemeContextProps = {
    theme,
    themeMode,
    setTheme: handleSetTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook for accessing the theme context
 */
export const useTheme = () => useContext(ThemeContext);
