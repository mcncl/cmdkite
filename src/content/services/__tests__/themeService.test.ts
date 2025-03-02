import { ThemeService } from "../themeService";
import { userPreferencesService } from "../preferences";
import { errorService } from "../errorService";

// Mock dependencies
jest.mock("../preferences", () => ({
  userPreferencesService: {
    getTheme: jest.fn().mockResolvedValue("system"),
    setTheme: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../errorService", () => ({
  errorService: {
    captureException: jest.fn(),
    logError: jest.fn(),
  },
}));

// Mock matchMedia
const mockMatchMedia = (prefersDark = false) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated but needed for coverage
      removeListener: jest.fn(), // Deprecated but needed for coverage
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe("ThemeService", () => {
  let themeService: ThemeService;
  let originalMatchMedia: any;

  beforeAll(() => {
    // Save original matchMedia
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    // Restore original matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any existing instances
    // @ts-ignore - accessing private property for testing
    ThemeService.instance = undefined;
    // Setup system theme detection mock
    mockMatchMedia(false); // Default to light mode
  });

  describe("getInstance", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = ThemeService.getInstance();
      const instance2 = ThemeService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("initialize", () => {
    it("should load saved theme from preferences", async () => {
      (userPreferencesService.getTheme as jest.Mock).mockResolvedValueOnce(
        "dark",
      );
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      expect(userPreferencesService.getTheme).toHaveBeenCalled();
      expect(themeService.getTheme()).toBe("dark");
    });

    it("should fall back to system theme on error", async () => {
      (userPreferencesService.getTheme as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to load theme"),
      );
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      expect(errorService.captureException).toHaveBeenCalled();
      expect(themeService.getTheme()).toBe("system");
    });

    it("should set up system theme detection", async () => {
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      expect(window.matchMedia).toHaveBeenCalledWith(
        "(prefers-color-scheme: dark)",
      );
    });

    it("should only initialize once", async () => {
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      (userPreferencesService.getTheme as jest.Mock).mockClear();

      await themeService.initialize();
      expect(userPreferencesService.getTheme).not.toHaveBeenCalled();
    });
  });

  describe("getTheme and getThemeMode", () => {
    it("should return the current theme setting", async () => {
      (userPreferencesService.getTheme as jest.Mock).mockResolvedValueOnce(
        "light",
      );
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      expect(themeService.getTheme()).toBe("light");
    });

    it("should return system preference as theme mode when theme is system", async () => {
      // Set up dark system preference
      mockMatchMedia(true);

      (userPreferencesService.getTheme as jest.Mock).mockResolvedValueOnce(
        "system",
      );
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      expect(themeService.getTheme()).toBe("system");
      expect(themeService.getThemeMode()).toBe("dark");
    });

    it("should return theme directly as theme mode for light/dark settings", async () => {
      (userPreferencesService.getTheme as jest.Mock).mockResolvedValueOnce(
        "dark",
      );
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      expect(themeService.getTheme()).toBe("dark");
      expect(themeService.getThemeMode()).toBe("dark");
    });
  });

  describe("setTheme", () => {
    it("should update theme and save to preferences", async () => {
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      await themeService.setTheme("dark");

      expect(userPreferencesService.setTheme).toHaveBeenCalledWith("dark");
      expect(themeService.getTheme()).toBe("dark");
      expect(themeService.getThemeMode()).toBe("dark");
    });

    it("should not update if theme is the same", async () => {
      (userPreferencesService.getTheme as jest.Mock).mockResolvedValueOnce(
        "light",
      );
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      await themeService.setTheme("light");

      expect(userPreferencesService.setTheme).not.toHaveBeenCalled();
    });

    it("should handle errors when saving theme", async () => {
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      (userPreferencesService.setTheme as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to save"),
      );

      await themeService.setTheme("dark");

      expect(errorService.captureException).toHaveBeenCalled();
    });

    it("should notify listeners when theme changes", async () => {
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      const mockListener = jest.fn();
      themeService.addEventListener("themeChanged", mockListener);

      await themeService.setTheme("dark");

      expect(mockListener).toHaveBeenCalledWith("dark", "dark");
    });
  });

  describe("addEventListener", () => {
    it("should add and call event listeners", async () => {
      themeService = ThemeService.getInstance();

      const mockListener = jest.fn();
      const removeListener = themeService.addEventListener(
        "themeChanged",
        mockListener,
      );

      await themeService.setTheme("dark");

      expect(mockListener).toHaveBeenCalled();
      expect(typeof removeListener).toBe("function");
    });

    it("should allow removing event listeners", async () => {
      themeService = ThemeService.getInstance();

      const mockListener = jest.fn();
      const removeListener = themeService.addEventListener(
        "themeChanged",
        mockListener,
      );

      removeListener();

      await themeService.setTheme("dark");

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe("system theme detection", () => {
    it("should update theme mode when system preference changes", async () => {
      // Set up light theme initially
      mockMatchMedia(false);

      (userPreferencesService.getTheme as jest.Mock).mockResolvedValueOnce(
        "system",
      );
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      expect(themeService.getThemeMode()).toBe("light");

      // Mock a change event for matchMedia
      const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");

      // Manually simulate the event listener being called
      // @ts-ignore - accessing private method for testing
      themeService.handleSystemThemeChange({
        matches: true,
      } as MediaQueryListEvent);

      expect(themeService.getThemeMode()).toBe("dark");
    });

    it("should not update theme mode when system preference changes but not using system theme", async () => {
      // Set up dark theme explicitly
      (userPreferencesService.getTheme as jest.Mock).mockResolvedValueOnce(
        "dark",
      );
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      expect(themeService.getThemeMode()).toBe("dark");

      // Manually simulate the event listener being called with light mode preference
      // @ts-ignore - accessing private method for testing
      themeService.handleSystemThemeChange({
        matches: false,
      } as MediaQueryListEvent);

      // Theme mode should still be dark as we're not using system theme
      expect(themeService.getThemeMode()).toBe("dark");
    });
  });

  describe("dispose", () => {
    it("should clean up resources", async () => {
      themeService = ThemeService.getInstance();
      await themeService.initialize();

      const styleElement = document.createElement("style");
      styleElement.id = "cmd-k-theme-vars";
      document.head.appendChild(styleElement);

      const constantStyleElement = document.createElement("style");
      constantStyleElement.id = "cmd-k-constant-vars";
      document.head.appendChild(constantStyleElement);

      // @ts-ignore - Manually set the styleElement for testing
      themeService.styleElement = styleElement;

      themeService.dispose();

      expect(document.getElementById("cmd-k-theme-vars")).toBeNull();
      expect(document.getElementById("cmd-k-constant-vars")).toBeNull();
    });
  });
});
