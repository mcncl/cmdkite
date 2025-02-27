import { pipelineSearchService } from "../pipelineSearchService";
import * as pipelineModule from "../../commands/pipeline";

// Sample test pipelines
const testPipelines = [
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

// Create a mock for cachedPipelines
let mockCachedPipelines: typeof testPipelines = [];

// Mock the pipeline module
jest.mock("../../commands/pipeline", () => {
  return {
    // Use a getter for cachedPipelines to prevent direct assignment
    get cachedPipelines() {
      return mockCachedPipelines;
    },
    fetchPipelines: jest.fn(),
    fuzzyMatch: jest.requireActual("../../util/search").fuzzyMatch,
  };
});

describe("PipelineSearchService", () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set up test data by updating the mock array
    mockCachedPipelines = [...testPipelines];

    // Mock fetchPipelines to return test data
    (pipelineModule.fetchPipelines as jest.Mock).mockResolvedValue(
      testPipelines,
    );
  });

  describe("searchPipelines", () => {
    it("returns empty array for empty search term", async () => {
      const results = await pipelineSearchService.searchPipelines("");
      expect(results).toEqual([]);
    });

    it("calls fetchPipelines if cache is empty", async () => {
      // Empty the cache
      mockCachedPipelines = [];

      await pipelineSearchService.searchPipelines("frontend");

      expect(pipelineModule.fetchPipelines).toHaveBeenCalled();
    });

    it("does not call fetchPipelines if cache is not empty", async () => {
      await pipelineSearchService.searchPipelines("frontend");

      expect(pipelineModule.fetchPipelines).not.toHaveBeenCalled();
    });

    it("returns results sorted by score", async () => {
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
      const limit = 1;
      const results = await pipelineSearchService.searchPipelines(
        "service",
        limit,
      );

      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it("handles search across multiple fields", async () => {
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
      // Empty the cache
      mockCachedPipelines = [];

      const results = pipelineSearchService.simpleFuzzySearch("frontend");
      expect(results).toEqual([]);
    });

    it("returns results sorted by score", () => {
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
