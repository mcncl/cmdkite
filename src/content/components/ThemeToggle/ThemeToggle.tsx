import React from "react";
import { useTheme } from "../ThemeProvider/ThemeProvider";
import { Theme } from "../../services/themeService";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: "small" | "medium" | "large"; // Added size prop
}

/**
 * Component for switching between themes
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  showLabel = false,
  size = "medium",
}) => {
  const { theme, themeMode, setTheme } = useTheme();

  // Handle theme selection
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  // Determine icon size based on size prop
  const getIconSize = (): number => {
    switch (size) {
      case "small":
        return 14;
      case "large":
        return 20;
      case "medium":
      default:
        return 16;
    }
  };

  const iconSize = getIconSize();

  // Render appropriate icon based on current theme
  const renderThemeIcon = () => {
    switch (themeMode) {
      case "light":
        return (
          <svg
            className="cmd-k-theme-icon"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        );
      case "dark":
        return (
          <svg
            className="cmd-k-theme-icon"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      default:
        return (
          <svg
            className="cmd-k-theme-icon"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3 L12 21" />
            <path d="M3 12 L21 12" />
            <path d="M12 3 A9 9 0 0 0 3 12 A9 9 0 0 0 12 21 A9 9 0 0 0 21 12 A9 9 0 0 0 12 3 Z" />
          </svg>
        );
    }
  };

  // Apply size-specific class
  const sizeClass = `cmd-k-theme-toggle-${size}`;

  return (
    <div className={`cmd-k-theme-toggle ${sizeClass} ${className}`}>
      <select
        className="cmd-k-theme-select"
        value={theme}
        onChange={(e) => handleThemeChange(e.target.value as Theme)}
        aria-label="Select theme"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
      <div className="cmd-k-theme-display">
        {renderThemeIcon()}
        {showLabel && (
          <span className="cmd-k-theme-label">
            {theme === "system"
              ? "System"
              : themeMode === "light"
                ? "Light"
                : "Dark"}
          </span>
        )}
      </div>
    </div>
  );
};
