export const mockChrome = {
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
        const defaults = {
          userPreferences: {
            recentPipelines: [],
            favoritePipelines: [],
            triggerKey: '',
            theme: 'system',
            defaultView: 'recent',
            maxResults: 7,
          },
          triggerKey: '',
        };
        
        if (typeof key === 'string') {
          callback({ [key]: defaults[key] });
        } else if (Array.isArray(key)) {
          const result = {};
          key.forEach(k => {
            result[k] = defaults[k];
          });
          callback(result);
        } else {
          callback({ ...key }); // Use provided defaults
        }
      }),
      set: jest.fn().mockImplementation((items, callback) => {
        if (callback) callback();
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
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://buildkite.com/test-org/test-pipeline' }]),
    sendMessage: jest.fn().mockImplementation((tabId, message, callback) => {
      if (callback) callback({ success: true });
    }),
  },
};

// Replace global chrome object with our mock
// @ts-ignore - We're intentionally replacing the global chrome object for testing
global.chrome = mockChrome as unknown as typeof chrome;

// Export for use in individual tests
export default mockChrome;
