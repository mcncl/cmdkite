import { PipelineService } from "../pipelineService";
import { Pipeline } from "../../types";

// Sample test data
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

describe("PipelineService", () => {
  let pipelineService: PipelineService;

  beforeEach(() => {
    pipelineService = new PipelineService();
    // Reset DOM mocks
    jest.restoreAllMocks();
  });

  describe("fetchPipelines", () => {
    it("fetches pipelines from the DOM", async () => {
      // Create a spy directly on the document.querySelectorAll method
      jest
        .spyOn(document, "querySelectorAll")
        .mockImplementation((selector: string) => {
          if (selector === '[data-testid="pipeline"]') {
            // Create mockPipelines array with everything fetchPipelines needs
            return testPipelines.map((pipeline) => ({
              querySelector: (sel: string) => {
                if (sel === ".flex-auto a") {
                  return {
                    getAttribute: (attr: string) => {
                      if (attr === "href") {
                        return `https://buildkite.com/${pipeline.organization}/${pipeline.slug}`;
                      }
                      return null;
                    },
                    querySelector: (innerSel: string) => {
                      if (innerSel === "h2 span[title]") {
                        return {
                          getAttribute: (attr: string) =>
                            attr === "title" ? pipeline.name : null,
                        };
                      }
                      if (innerSel === ".text-sm.regular[title]") {
                        return {
                          getAttribute: (attr: string) =>
                            attr === "title" ? pipeline.description : null,
                        };
                      }
                      return null;
                    },
                  };
                }
                if (sel === '[data-testid="emoji-avatar-base"] .leading-none') {
                  return null; // No emoji for test
                }
                return null;
              },
              querySelectorAll: () => [],
            })) as any as NodeListOf<Element>;
          }
          return [] as any as NodeListOf<Element>;
        });

      const result = await pipelineService.fetchPipelines();

      // Verify we got the right number of pipelines
      expect(result.length).toBe(testPipelines.length);

      // Verify content of first pipeline
      expect(result[0].name).toBe(testPipelines[0].name);
      expect(result[0].slug).toBe(testPipelines[0].slug);
      expect(result[0].organization).toBe(testPipelines[0].organization);
    });

    it("handles empty results gracefully", async () => {
      // Mock empty DOM
      jest
        .spyOn(document, "querySelectorAll")
        .mockReturnValue([] as unknown as NodeListOf<Element>);

      const result = await pipelineService.fetchPipelines();
      expect(result).toEqual([]);
    });

    it("handles DOM parsing errors gracefully", async () => {
      // Mock error
      jest.spyOn(document, "querySelectorAll").mockImplementation(() => {
        throw new Error("DOM error");
      });

      const result = await pipelineService.fetchPipelines();
      expect(result).toEqual([]);
    });
  });

  describe("getPipeline", () => {
    it("finds a pipeline by org and slug", async () => {
      // Set up test pipelines in service
      pipelineService["_pipelines"] = [...testPipelines];

      const result = pipelineService.getPipeline("testorg", "frontend-service");

      expect(result).toBeDefined();
      expect(result?.name).toBe("Frontend Service");
    });

    it("returns undefined for non-existent pipeline", () => {
      // Set up test pipelines in service
      pipelineService["_pipelines"] = [...testPipelines];

      const result = pipelineService.getPipeline("nonexistent", "pipeline");

      expect(result).toBeUndefined();
    });
  });

  describe("searchPipelines", () => {
    beforeEach(() => {
      // Set up test pipelines in service
      pipelineService["_pipelines"] = [...testPipelines];
    });

    it("returns empty array for empty search term", async () => {
      const results = await pipelineService.searchPipelines("");
      expect(results).toEqual([]);
    });

    it("returns results sorted by score", async () => {
      const results = await pipelineService.searchPipelines("frontend");

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
      const results = await pipelineService.searchPipelines("service", limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it("fetches pipelines if requested when none are cached", async () => {
      // Clear the pipeline cache
      pipelineService.clearCache();

      // Mock the fetch method
      const fetchSpy = jest
        .spyOn(pipelineService, "fetchPipelines")
        .mockResolvedValue([...testPipelines]);

      await pipelineService.searchPipelines("frontend", 5, true);

      expect(fetchSpy).toHaveBeenCalled();
    });

    it("searches across multiple fields", async () => {
      // Test search in name
      const nameResults = await pipelineService.searchPipelines("Frontend");
      expect(nameResults.length).toBeGreaterThan(0);
      expect(nameResults[0].pipeline.name).toBe("Frontend Service");

      // Test search in slug
      const slugResults = await pipelineService.searchPipelines("backend-api");
      expect(slugResults.length).toBeGreaterThan(0);
      expect(slugResults[0].pipeline.slug).toBe("backend-api");

      // Test search in organization
      const orgResults = await pipelineService.searchPipelines("dataorg");
      expect(orgResults.length).toBeGreaterThan(0);
      expect(orgResults[0].pipeline.organization).toBe("dataorg");

      // Test search in description
      const descResults = await pipelineService.searchPipelines("ETL");
      expect(descResults.length).toBeGreaterThan(0);
      expect(descResults[0].pipeline.description).toContain("ETL");
    });
  });
});
