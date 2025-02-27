import { pipelineSearchService } from "../pipelineSearchService";
import { Pipeline } from "../../types";

// Sample test pipelines
const testPipelines: Pipeline[] = [
  {
    name: "Frontend Service",
    slug: "frontend-service",
    organization: "testorg",
    description: "A service for rendering UI components",
  },
  {
    name: "Backend API",
    slug: "backend-api",
    organization: "testorg",
    description: "Core API service",
  },
  {
    name: "Data Processing",
    slug: "data-processing",
    organization: "dataorg",
    description: "Data ETL pipeline",
  },
];

// Mock the pipelineService - needs to be after testPipelines definition
jest.mock("../pipelineService", () => {
  const mockPipelineService = {
    fetchPipelines: jest.fn().mockResolvedValue([]),
    pipelines: [],
    clearCache: jest.fn(),
    ensurePipelinesLoaded: jest.fn(),
  };
  return {
    pipelineService: mockPipelineService,
  };
});

// Import the mocked service after the mock is defined
import { pipelineService } from "../pipelineService";

describe("PipelineSearchService", () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set up test mock behavior with the proper data
    jest
      .mocked(pipelineService.fetchPipelines)
      .mockResolvedValue([...testPipelines]);
  });

  describe("searchPipelines", () => {
    it("returns empty array for empty search term", async () => {
      const results = await pipelineSearchService.searchPipelines("");
      expect(results).toEqual([]);
    });

    it("calls fetchPipelines if cache is empty", async () => {
      // Ensure pipelines array is empty to trigger the fetch
      Object.defineProperty(pipelineService, "pipelines", {
        get: jest.fn().mockReturnValue([]),
      });

      await pipelineSearchService.searchPipelines("frontend");

      expect(pipelineService.fetchPipelines).toHaveBeenCalled();
    });

    it("does not call fetchPipelines if cache is not empty", async () => {
      // Mock that pipelines array has content
      Object.defineProperty(pipelineService, "pipelines", {
        get: jest.fn().mockReturnValue([...testPipelines]),
      });

      await pipelineSearchService.searchPipelines("frontend");

      expect(pipelineService.fetchPipelines).not.toHaveBeenCalled();
    });

    it("returns results sorted by score", async () => {
      // Mock that pipelines array has content
      Object.defineProperty(pipelineService, "pipelines", {
        get: jest.fn().mockReturnValue([...testPipelines]),
      });

      const results = await pipelineSearchService.searchPipelines("frontend");

      expect(results.length).toBeGreaterThan(0);

      // First result should be Frontend Service with highest score
      expect(results[0].pipeline.name).toBe("Frontend Service");

      // Results should be sorted by score (descending)
      expect(
        results.every(
          (result, i) => i === 0 || result.score <= results[i - 1].score,
        ),
      ).toBe(true);
    });

    it("limits results to specified number", async () => {
      // Mock that pipelines array has content
      Object.defineProperty(pipelineService, "pipelines", {
        get: jest.fn().mockReturnValue([...testPipelines]),
      });

      const limit = 1;
      const results = await pipelineSearchService.searchPipelines(
        "service",
        limit,
      );

      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it("handles search across multiple fields", async () => {
      // Mock that pipelines array has content
      Object.defineProperty(pipelineService, "pipelines", {
        get: jest.fn().mockReturnValue([...testPipelines]),
      });

      // Test search in name
      const nameResults =
        await pipelineSearchService.searchPipelines("Frontend");
      expect(nameResults.length).toBeGreaterThan(0);
      expect(nameResults[0].pipeline.name).toBe("Frontend Service");

      // Test search in slug
      const slugResults =
        await pipelineSearchService.searchPipelines("backend-api");
      expect(slugResults.length).toBeGreaterThan(0);
      expect(slugResults[0].pipeline.slug).toBe("backend-api");

      // Test search in organization
      const orgResults = await pipelineSearchService.searchPipelines("dataorg");
      expect(orgResults.length).toBeGreaterThan(0);
      expect(orgResults[0].pipeline.organization).toBe("dataorg");

      // Test search in description
      const descResults = await pipelineSearchService.searchPipelines("ETL");
      expect(descResults.length).toBeGreaterThan(0);
      expect(descResults[0].pipeline.description).toContain("ETL");
    });
  });

  describe("simpleFuzzySearch", () => {
    it("returns empty array for empty search term", () => {
      const results = pipelineSearchService.simpleFuzzySearch("");
      expect(results).toEqual([]);
    });

    it("returns empty array if no pipelines in cache", () => {
      // Ensure pipelines array is empty
      Object.defineProperty(pipelineService, "pipelines", {
        get: jest.fn().mockReturnValue([]),
      });

      const results = pipelineSearchService.simpleFuzzySearch("frontend");
      expect(results).toEqual([]);
    });

    it("returns results sorted by score", () => {
      // Mock that pipelines array has content
      Object.defineProperty(pipelineService, "pipelines", {
        get: jest.fn().mockReturnValue([...testPipelines]),
      });

      const results = pipelineSearchService.simpleFuzzySearch("frontend");

      expect(results.length).toBeGreaterThan(0);

      // First result should be Frontend Service with highest score
      expect(results[0].pipeline.name).toBe("Frontend Service");

      // Results should be sorted by score (descending)
      expect(
        results.every(
          (result, i) => i === 0 || result.score <= results[i - 1].score,
        ),
      ).toBe(true);
    });
  });
});
