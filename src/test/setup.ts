import "@testing-library/jest-dom";

// Mock Chrome API
const createMockChrome = () => {
  return {
    runtime: {
      connect: jest.fn().mockReturnValue({
        onDisconnect: {
          addListener: jest.fn(),
        },
        disconnect: jest.fn(),
      }),
      onMessage: {
        addListener: jest.fn(),
      },
      onConnect: {
        addListener: jest.fn(),
      },
      sendMessage: jest.fn(),
    },
    storage: {
      sync: {
        get: jest.fn().mockImplementation((key, callback) => {
          // Mock default values
          const defaults: Record<string, any> = {
            userPreferences: {
              recentPipelines: [],
              favoritePipelines: [],
              triggerKey: "",
              theme: "system",
              defaultView: "recent",
              maxResults: 7,
            },
            triggerKey: "",
          };

          if (typeof key === "string") {
            if (callback) {
              callback({ [key]: defaults[key] || null });
            }
          } else if (Array.isArray(key)) {
            const result: Record<string, any> = {};
            key.forEach((k) => {
              result[k] = defaults[k] || null;
            });
            if (callback) {
              callback(result);
            }
          } else {
            if (callback) {
              callback({ ...key }); // Use provided defaults
            }
          }
          return Promise.resolve();
        }),
        set: jest.fn().mockImplementation((items, callback) => {
          if (callback) {
            callback();
          }
          return Promise.resolve();
        }),
      },
    },
    commands: {
      onCommand: {
        addListener: jest.fn(),
      },
    },
    scripting: {
      executeScript: jest.fn().mockResolvedValue([]),
    },
    tabs: {
      query: jest
        .fn()
        .mockResolvedValue([
          { id: 1, url: "https://buildkite.com/test-org/test-pipeline" },
        ]),
      sendMessage: jest.fn().mockImplementation((tabId, message, callback) => {
        if (callback) {
          callback({ success: true });
        }
        return Promise.resolve();
      }),
    },
  };
};

// Mock window.location
const mockLocation = () => {
  const locationMock = {
    href: "https://buildkite.com/test-org/test-pipeline",
    pathname: "/test-org/test-pipeline",
    hostname: "buildkite.com",
    reload: jest.fn(),
  };

  // Save the original implementation
  const originalLocation = window.location;

  // Define a new location object
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...locationMock,
      assign: jest.fn((url: string) => {
        locationMock.href = url;
      }),
    },
    writable: true,
  });

  // Return a function to restore original
  return () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
  };
};

// Mock document query selector functions
const mockDocumentQueries = () => {
  const originalQuerySelector = document.querySelector;
  const originalQuerySelectorAll = document.querySelectorAll;

  document.querySelector = jest.fn().mockImplementation((selector: string) => {
    // Return mock elements for specific selectors used in tests
    if (selector === ".selected") {
      return { getBoundingClientRect: () => ({ top: 100, bottom: 120 }) };
    }
    if (selector === ".cmd-k-results") {
      return {
        getBoundingClientRect: () => ({ top: 80, bottom: 300 }),
        scrollTop: 0,
      };
    }
    return null;
  });

  document.querySelectorAll = jest
    .fn()
    .mockImplementation((selector: string) => {
      if (selector === '[data-testid="pipeline"]') {
        return [] as unknown as NodeListOf<Element>;
      }
      return [] as unknown as NodeListOf<Element>;
    });

  // Return a function to restore originals
  return () => {
    document.querySelector = originalQuerySelector;
    document.querySelectorAll = originalQuerySelectorAll;
  };
};

// Set up mocks before tests
const restoreLocation = mockLocation();
const restoreDocumentQueries = mockDocumentQueries();

// @ts-ignore - We're intentionally replacing the global chrome object for testing
global.chrome = createMockChrome() as unknown as typeof chrome;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Restore original functions after all tests
afterAll(() => {
  restoreLocation();
  restoreDocumentQueries();
});
