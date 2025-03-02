import React from "react";
import {
  render,
  act,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeProvider";
import { themeService } from "../../../services/themeService";

// Mock the theme service
jest.mock("../../../services/themeService", () => ({
  themeService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getTheme: jest.fn().mockReturnValue("system"),
    getThemeMode: jest.fn().mockReturnValue("light"),
    setTheme: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn().mockImplementation((event, callback) => {
      // Return a remove listener function
      return jest.fn();
    }),
  },
}));

// Mock the error handler hook
jest.mock("../../../hooks", () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

// Test component to access theme context
const TestConsumer = () => {
  const { theme, themeMode, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="theme-mode">{themeMode}</div>
      <button data-testid="set-theme-light" onClick={() => setTheme("light")}>
        Set Light
      </button>
      <button data-testid="set-theme-dark" onClick={() => setTheme("dark")}>
        Set Dark
      </button>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe("ThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize theme service on mount", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(themeService.initialize).toHaveBeenCalled();
    });
  });

  it("should provide theme context values", async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("system");
      expect(screen.getByTestId("theme-mode")).toHaveTextContent("light");
    });
  });

  it("should call setTheme when requested", async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("set-theme-light"));
      expect(themeService.setTheme).toHaveBeenCalledWith("light");
    });
  });

  it("should handle toggleTheme for non-system theme", async () => {
    // Mock current theme as light
    (themeService.getTheme as jest.Mock).mockReturnValue("light");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("toggle-theme"));
      expect(themeService.setTheme).toHaveBeenCalledWith("dark");
    });
  });

  it("should handle toggleTheme for system theme", async () => {
    // Mock current theme as system and mode as light
    (themeService.getTheme as jest.Mock).mockReturnValue("system");
    (themeService.getThemeMode as jest.Mock).mockReturnValue("light");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => {
      fireEvent.click(screen.getByTestId("toggle-theme"));
      expect(themeService.setTheme).toHaveBeenCalledWith("dark");
    });
  });

  it("should set up theme change listener", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(themeService.addEventListener).toHaveBeenCalledWith(
        "themeChanged",
        expect.any(Function),
      );
    });
  });

  it("should update state when theme changes", async () => {
    // Capture the change listener to manually trigger it
    let themeChangeListener: Function;
    (themeService.addEventListener as jest.Mock).mockImplementation(
      (event, listener) => {
        if (event === "themeChanged") {
          themeChangeListener = listener;
        }
        return jest.fn();
      },
    );

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("system");
      expect(screen.getByTestId("theme-mode")).toHaveTextContent("light");
    });

    // Now simulate a theme change
    act(() => {
      themeChangeListener("dark", "dark");
    });

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("theme-mode")).toHaveTextContent("dark");
    });
  });
});
