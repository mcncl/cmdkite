import { pipelineDetailsService, BuildStatus } from "../pipelineDetailsService";
import { errorService } from "../errorService";

// Mock the fetch API
global.fetch = jest.fn();

// Mock the errorService
jest.mock("./errorService", () => ({
  errorService: {
    logError: jest.fn(),
    captureException: jest.fn(),
  },
}));

// Mock the DOMParser
const mockParseFromString = jest.fn();
global.DOMParser = jest.fn().mockImplementation(() => {
  return {
    parseFromString: mockParseFromString,
  };
});

describe("PipelineDetailsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pipelineDetailsService.clearCache();

    // Default mock for fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<html><body></body></html>"),
    });

    // Default mock for DOMParser
    mockParseFromString.mockReturnValue(document.createElement("div"));
  });

  describe("getStatusColor", () => {
    it("should return correct color for each status", () => {
      expect(pipelineDetailsService.getStatusColor(BuildStatus.PASSED)).toBe(
        "#10B981",
      );
      expect(pipelineDetailsService.getStatusColor(BuildStatus.FAILED)).toBe(
        "#EF4444",
      );
      expect(pipelineDetailsService.getStatusColor(BuildStatus.RUNNING)).toBe(
        "#3B82F6",
      );
      expect(pipelineDetailsService.getStatusColor(BuildStatus.SCHEDULED)).toBe(
        "#F59E0B",
      );
      expect(pipelineDetailsService.getStatusColor(BuildStatus.CANCELED)).toBe(
        "#6B7280",
      );
      expect(pipelineDetailsService.getStatusColor(BuildStatus.UNKNOWN)).toBe(
        "#9CA3AF",
      );
    });
  });

  describe("getStatusIcon", () => {
    it("should return correct icon for each status", () => {
      expect(pipelineDetailsService.getStatusIcon(BuildStatus.PASSED)).toBe(
        "check-circle",
      );
      expect(pipelineDetailsService.getStatusIcon(BuildStatus.FAILED)).toBe(
        "x-circle",
      );
      expect(pipelineDetailsService.getStatusIcon(BuildStatus.RUNNING)).toBe(
        "loader",
      );
      expect(pipelineDetailsService.getStatusIcon(BuildStatus.SCHEDULED)).toBe(
        "clock",
      );
      expect(pipelineDetailsService.getStatusIcon(BuildStatus.CANCELED)).toBe(
        "slash",
      );
      expect(pipelineDetailsService.getStatusIcon(BuildStatus.UNKNOWN)).toBe(
        "help-circle",
      );
    });
  });

  describe("formatDuration", () => {
    it("should format seconds correctly", () => {
      expect(pipelineDetailsService.formatDuration(30)).toBe("30s");
      expect(pipelineDetailsService.formatDuration(75)).toBe("1m 15s");
      expect(pipelineDetailsService.formatDuration(3600)).toBe("1h 0m");
      expect(pipelineDetailsService.formatDuration(3661)).toBe("1h 1m");
    });
  });

  describe("getPipelineBuilds", () => {
    it("should fetch builds from API when not cached", async () => {
      // Mock HTML response with build data
      const mockHTML = `
        <div data-testid="build">
          <div data-testid="build-number">#123</div>
          <div data-testid="build-status" class="passed">Passed</div>
          <span class="relative-time">2023-01-01T12:00:00Z</span>
          <div data-testid="build-duration">2m 30s</div>
          <div data-testid="commit-hash">abc123</div>
          <div data-testid="branch-name">main</div>
          <div data-testid="commit-message">Fix bug</div>
          <div data-testid="build-creator">John Doe</div>
        </div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHTML),
      });

      // Mock document parsing
      const mockDOM = document.createElement("div");
      mockDOM.innerHTML = mockHTML;
      mockParseFromString.mockReturnValue(mockDOM);

      // Call the service
      const pipeline = { organization: "test-org", slug: "test-pipeline" };
      const builds = await pipelineDetailsService.getPipelineBuilds(pipeline);

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith(
        "https://buildkite.com/test-org/test-pipeline",
      );

      // Verify build data was parsed correctly
      expect(builds.length).toBe(1);
      expect(builds[0].number).toBe(123);
      expect(builds[0].status).toBe(BuildStatus.PASSED);
    });

    it("should use cached data when available and not stale", async () => {
      // Setup cache with test data
      const pipeline = { organization: "test-org", slug: "test-pipeline" };

      // First call to populate cache
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            '<div data-testid="build"><div data-testid="build-number">#123</div></div>',
          ),
      });

      const mockDOM = document.createElement("div");
      mockDOM.innerHTML =
        '<div data-testid="build"><div data-testid="build-number">#123</div></div>';
      mockParseFromString.mockReturnValue(mockDOM);

      await pipelineDetailsService.getPipelineBuilds(pipeline);

      // Reset mocks to verify they're not called again
      (global.fetch as jest.Mock).mockClear();
      mockParseFromString.mockClear();

      // Second call should use cache
      const builds = await pipelineDetailsService.getPipelineBuilds(pipeline);

      // Verify fetch was NOT called
      expect(global.fetch).not.toHaveBeenCalled();

      // Verify correct data was returned
      expect(builds.length).toBe(1);
      expect(builds[0].number).toBe(123);
    });

    it("should handle API errors gracefully", async () => {
      // Setup fetch to fail
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      // Call the service
      const pipeline = { organization: "test-org", slug: "test-pipeline" };
      const builds = await pipelineDetailsService.getPipelineBuilds(pipeline);

      // Verify error was logged
      expect(errorService.captureException).toHaveBeenCalled();

      // Verify empty array is returned
      expect(builds).toEqual([]);
    });
  });

  describe("getPipelineStats", () => {
    it("should calculate stats correctly from builds data", async () => {
      // Mock HTML response with multiple builds
      const mockHTML = `
        <div data-testid="build">
          <div data-testid="build-number">#123</div>
          <div data-testid="build-status" class="passed">Passed</div>
          <span class="relative-time">2023-01-01T12:00:00Z</span>
          <div data-testid="build-duration">2m 0s</div>
        </div>
        <div data-testid="build">
          <div data-testid="build-number">#122</div>
          <div data-testid="build-status" class="failed">Failed</div>
          <span class="relative-time">2023-01-01T11:00:00Z</span>
          <div data-testid="build-duration">1m 30s</div>
        </div>
        <div data-testid="build">
          <div data-testid="build-number">#121</div>
          <div data-testid="build-status" class="passed">Passed</div>
          <span class="relative-time">2023-01-01T10:00:00Z</span>
          <div data-testid="build-duration">1m 0s</div>
        </div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHTML),
      });

      // Mock document parsing
      const mockDOM = document.createElement("div");
      mockDOM.innerHTML = mockHTML;
      mockParseFromString.mockReturnValue(mockDOM);

      // Call the service
      const pipeline = { organization: "test-org", slug: "test-pipeline" };
      const stats = await pipelineDetailsService.getPipelineStats(pipeline);

      // Verify stats calculations
      expect(stats.buildCount).toBe(3);
      expect(stats.successRate).toBe(2 / 3); // 2 out of 3 builds passed
      expect(stats.avgDuration).toBe(90); // (120 + 90 + 60) / 3 = 90 seconds
      expect(stats.lastBuildStatus).toBe(BuildStatus.PASSED); // Most recent build was passed
    });
  });

  describe("getLastBuild", () => {
    it("should return the most recent build by build number", async () => {
      // Mock HTML response with multiple builds
      const mockHTML = `
        <div data-testid="build">
          <div data-testid="build-number">#123</div>
          <div data-testid="build-status" class="passed">Passed</div>
        </div>
        <div data-testid="build">
          <div data-testid="build-number">#124</div>
          <div data-testid="build-status" class="running">Running</div>
        </div>
        <div data-testid="build">
          <div data-testid="build-number">#122</div>
          <div data-testid="build-status" class="failed">Failed</div>
        </div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHTML),
      });

      // Mock document parsing
      const mockDOM = document.createElement("div");
      mockDOM.innerHTML = mockHTML;
      mockParseFromString.mockReturnValue(mockDOM);

      // Call the service
      const pipeline = { organization: "test-org", slug: "test-pipeline" };
      const lastBuild = await pipelineDetailsService.getLastBuild(pipeline);

      // Verify last build is the one with highest number
      expect(lastBuild).not.toBeNull();
      expect(lastBuild?.number).toBe(124);
      expect(lastBuild?.status).toBe(BuildStatus.RUNNING);
    });

    it("should return null when no builds are found", async () => {
      // Mock empty HTML response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("<div></div>"),
      });

      // Mock empty document
      mockParseFromString.mockReturnValue(document.createElement("div"));

      // Call the service
      const pipeline = { organization: "test-org", slug: "test-pipeline" };
      const lastBuild = await pipelineDetailsService.getLastBuild(pipeline);

      // Verify no build was found
      expect(lastBuild).toBeNull();
    });
  });

  describe("refreshPipelineData", () => {
    it("should force refresh the cache for a specific pipeline", async () => {
      const pipeline = { organization: "test-org", slug: "test-pipeline" };

      // Mock initial data
      const mockHTML1 = `
        <div data-testid="build">
          <div data-testid="build-number">#123</div>
          <div data-testid="build-status" class="passed">Passed</div>
        </div>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHTML1),
      });

      const mockDOM1 = document.createElement("div");
      mockDOM1.innerHTML = mockHTML1;
      mockParseFromString.mockReturnValueOnce(mockDOM1);

      // First call to populate cache
      await pipelineDetailsService.getPipelineBuilds(pipeline);

      // Mock updated data for refresh
      const mockHTML2 = `
        <div data-testid="build">
          <div data-testid="build-number">#124</div>
          <div data-testid="build-status" class="running">Running</div>
        </div>
        <div data-testid="build">
          <div data-testid="build-number">#123</div>
          <div data-testid="build-status" class="passed">Passed</div>
        </div>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHTML2),
      });

      const mockDOM2 = document.createElement("div");
      mockDOM2.innerHTML = mockHTML2;
      mockParseFromString.mockReturnValueOnce(mockDOM2);

      // Refresh the pipeline data
      await pipelineDetailsService.refreshPipelineData(pipeline);

      // Get the data again (should use the refreshed cache)
      const builds = await pipelineDetailsService.getPipelineBuilds(pipeline);

      // Verify we have the updated data
      expect(builds.length).toBe(2);
      expect(builds[0].number).toBe(124);
      expect(builds[0].status).toBe(BuildStatus.RUNNING);

      // Verify fetch was called only for the initial load and the refresh
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should handle errors during refresh", async () => {
      const pipeline = { organization: "test-org", slug: "test-pipeline" };

      // Mock initial data
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            '<div data-testid="build"><div data-testid="build-number">#123</div></div>',
          ),
      });

      const mockDOM = document.createElement("div");
      mockDOM.innerHTML =
        '<div data-testid="build"><div data-testid="build-number">#123</div></div>';
      mockParseFromString.mockReturnValueOnce(mockDOM);

      // First call to populate cache
      await pipelineDetailsService.getPipelineBuilds(pipeline);

      // Mock failure during refresh
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error during refresh"),
      );

      // Attempt to refresh (should not throw but log error)
      await pipelineDetailsService.refreshPipelineData(pipeline);

      // Verify error was logged
      expect(errorService.captureException).toHaveBeenCalled();

      // Verify we still have the original cached data
      const builds = await pipelineDetailsService.getPipelineBuilds(pipeline);
      expect(builds.length).toBe(1);
      expect(builds[0].number).toBe(123);
    });
  });
});
