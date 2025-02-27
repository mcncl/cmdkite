import { searchService } from "../searchService";
import { userPreferencesService } from "../preferences";
import { pipelineService } from "../pipelineService";
import { CommandManager } from "../commandManager";
import { Command, Pipeline } from "../../types";

// Mock dependencies
jest.mock("../preferences");
jest.mock("../pipelineService");
jest.mock("../commandManager");

// Sample test data
const testCommands: Command[] = [
  {
    id: "pipeline",
    name: "Go to Pipeline",
    description: "Navigate to a specific pipeline",
    keywords: ["pipeline", "goto"],
    execute: jest.fn(),
  },
  {
    id: "new-build",
    name: "Create New Build",
    description: "Navigate to create a new build for a pipeline",
    keywords: ["build", "run", "start", "deploy", "trigger"],
    execute: jest.fn(),
  },
  {
    id: "list-pipelines",
    name: "View all Pipelines",
    description: "View all pipelines for the current organization",
    keywords: ["list", "view", "show", "pipelines"],
    execute: jest.fn(),
  },
];

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

describe("SearchService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CommandManager
    const mockedCommandManager = CommandManager as jest.MockedClass<
      typeof CommandManager
    >;
    mockedCommandManager.prototype.getAllAvailableCommands = jest
      .fn()
      .mockReturnValue(testCommands);

    // Mock PipelineService
    Object.defineProperty(pipelineService, "pipelines", {
      get: jest.fn().mockReturnValue(testPipelines),
    });

    jest
      .spyOn(pipelineService, "fetchPipelines")
      .mockResolvedValue(testPipelines);
    jest
      .spyOn(pipelineService, "ensurePipelinesLoaded")
      .mockResolvedValue(true);
    jest
      .spyOn(pipelineService, "getPipeline")
      .mockImplementation((org, slug) => {
        return testPipelines.find(
          (p) => p.organization === org && p.slug === slug,
        );
      });

    // Mock UserPreferencesService
    jest
      .spyOn(userPreferencesService, "getRecentSearches")
      .mockResolvedValue([]);
    jest.spyOn(userPreferencesService, "setRecentSearches").mockResolvedValue();
    jest
      .spyOn(userPreferencesService, "getRecentPipelines")
      .mockResolvedValue([]);
    jest
      .spyOn(userPreferencesService, "getFavoritePipelines")
      .mockResolvedValue([]);
  });

  describe("searchCommands", () => {
    it("returns all available commands for empty search", () => {
      const results = searchService.searchCommands("");

      expect(results).toHaveLength(testCommands.length);
      expect(results[0].command).toBe(testCommands[0]);
      expect(results[0].score).toBe(1);
    });

    it("finds commands by ID", () => {
      const results = searchService.searchCommands("pipeline");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].command.id).toBe("pipeline");
      expect(results[0].score).toBeGreaterThan(0);
    });

    it("finds commands by name", () => {
      const results = searchService.searchCommands("Create New");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].command.name).toBe("Create New Build");
    });

    it("finds commands by keyword", () => {
      const results = searchService.searchCommands("deploy");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].command.id).toBe("new-build");
    });

    it("handles direct reference with slash", () => {
      const results = searchService.searchCommands("/pipeline");

      expect(results.length).toBe(1);
      expect(results[0].command.id).toBe("pipeline");
      expect(results[0].score).toBe(100);
    });

    it("sorts results by score", () => {
      const results = searchService.searchCommands("pipeline");

      expect(results.length).toBeGreaterThan(1);

      // Results should be sorted by score (descending)
      expect(
        results.every(
          (result, i) => i === 0 || result.score <= results[i - 1].score,
        ),
      ).toBe(true);
    });
  });

  describe("searchPipelines", () => {
    it("returns empty array for empty search term", async () => {
      const results = await searchService.searchPipelines("");
      expect(results).toEqual([]);
    });

    it("tries to fetch pipelines if none are cached", async () => {
      // Mock empty pipeline cache
      Object.defineProperty(pipelineService, "pipelines", {
        get: jest.fn().mockReturnValue([]),
      });

      await searchService.searchPipelines("frontend");

      expect(pipelineService.fetchPipelines).toHaveBeenCalled();
    });

    it("doesn't try to fetch if ensureLoaded is false", async () => {
      // Mock empty pipeline cache
      Object.defineProperty(pipelineService, "pipelines", {
        get: jest.fn().mockReturnValue([]),
      });

      await searchService.searchPipelines("frontend", 5, false);

      expect(pipelineService.fetchPipelines).not.toHaveBeenCalled();
    });

    it("saves search term to recent searches", async () => {
      await searchService.searchPipelines("frontend");

      expect(userPreferencesService.setRecentSearches).toHaveBeenCalled();
    });

    it("returns results sorted by score", async () => {
      const results = await searchService.searchPipelines("frontend");

      expect(results.length).toBeGreaterThan(0);
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
      const results = await searchService.searchPipelines("service", limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it("searches across multiple fields", async () => {
      // Test search in name
      const nameResults = await searchService.searchPipelines("Frontend");
      expect(nameResults.length).toBeGreaterThan(0);
      expect(nameResults[0].pipeline.name).toBe("Frontend Service");

      // Test search in slug
      const slugResults = await searchService.searchPipelines("backend-api");
      expect(slugResults.length).toBeGreaterThan(0);
      expect(slugResults[0].pipeline.slug).toBe("backend-api");

      // Test search in organization
      const orgResults = await searchService.searchPipelines("dataorg");
      expect(orgResults.length).toBeGreaterThan(0);
      expect(orgResults[0].pipeline.organization).toBe("dataorg");

      // Test search in description
      const descResults = await searchService.searchPipelines("ETL");
      expect(descResults.length).toBeGreaterThan(0);
      expect(descResults[0].pipeline.description).toContain("ETL");
    });
  });

  describe("Recent searches management", () => {
    it("loads recent searches from preferences", async () => {
      const mockSearches = ["test", "recent", "search"];
      jest
        .spyOn(userPreferencesService, "getRecentSearches")
        .mockResolvedValue(mockSearches);

      const results = await searchService.getRecentSearches();

      expect(results).toEqual(mockSearches);
      expect(userPreferencesService.getRecentSearches).toHaveBeenCalled();
    });

    it("saves recent searches to preferences", async () => {
      await searchService.saveRecentSearch("test-search");

      expect(userPreferencesService.setRecentSearches).toHaveBeenCalled();
    });

    it("adds new searches to the beginning of the list", async () => {
      const existingSearches = ["search1", "search2"];
      jest
        .spyOn(userPreferencesService, "getRecentSearches")
        .mockResolvedValue(existingSearches);

      await searchService.saveRecentSearch("new-search");

      // Check that setRecentSearches was called with new search at the beginning
      const setRecentSearchesMock =
        userPreferencesService.setRecentSearches as jest.Mock;
      const callArgs = setRecentSearchesMock.mock.calls[0][0];

      expect(callArgs[0]).toBe("new-search");
      expect(callArgs).toContain("search1");
      expect(callArgs).toContain("search2");
    });

    it("removes duplicates when saving searches", async () => {
      const existingSearches = ["search1", "search2", "search3"];
      jest
        .spyOn(userPreferencesService, "getRecentSearches")
        .mockResolvedValue(existingSearches);

      await searchService.saveRecentSearch("search2");

      // Check that setRecentSearches was called with "search2" only once and at beginning
      const setRecentSearchesMock =
        userPreferencesService.setRecentSearches as jest.Mock;
      const callArgs = setRecentSearchesMock.mock.calls[0][0];

      expect(callArgs[0]).toBe("search2");
      expect(callArgs.filter((s: string) => s === "search2").length).toBe(1);
    });

    it("limits the number of recent searches", async () => {
      // Create array with MAX_RECENT_SEARCHES + 5 items
      const manySearches = Array.from({ length: 15 }, (_, i) => `search${i}`);
      jest
        .spyOn(userPreferencesService, "getRecentSearches")
        .mockResolvedValue(manySearches);

      await searchService.saveRecentSearch("new-search");

      // Check that setRecentSearches was called with limited number of items
      const setRecentSearchesMock =
        userPreferencesService.setRecentSearches as jest.Mock;
      const callArgs = setRecentSearchesMock.mock.calls[0][0];

      expect(callArgs.length).toBeLessThanOrEqual(11); // MAX_RECENT_SEARCHES (10) + 1 new item
      expect(callArgs[0]).toBe("new-search");
    });

    it("clears recent searches", async () => {
      await searchService.clearRecentSearches();

      expect(userPreferencesService.setRecentSearches).toHaveBeenCalledWith([]);
    });
  });

  describe("getFavoritePipelines", () => {
    it("returns favorite pipelines from preferences", async () => {
      // Setup favorite pipelines
      const favoritePipelineIds = [
        "testorg/frontend-service",
        "dataorg/data-processing",
      ];
      jest
        .spyOn(userPreferencesService, "getFavoritePipelines")
        .mockResolvedValue(favoritePipelineIds);

      const results = await searchService.getFavoritePipelines();

      expect(results.length).toBe(2);
      expect(results[0].name).toBe("Frontend Service");
      expect(results[1].organization).toBe("dataorg");
    });

    it("creates minimal pipeline objects for favorites not in cache", async () => {
      // Setup favorite that doesn't exist in the test pipelines
      const favoritePipelineIds = ["unknown-org/unknown-pipeline"];
      jest
        .spyOn(userPreferencesService, "getFavoritePipelines")
        .mockResolvedValue(favoritePipelineIds);
      jest.spyOn(pipelineService, "getPipeline").mockReturnValue(undefined);

      const results = await searchService.getFavoritePipelines();

      expect(results.length).toBe(1);
      expect(results[0].organization).toBe("unknown-org");
      expect(results[0].slug).toBe("unknown-pipeline");
      expect(results[0].name).toBe("unknown-pipeline"); // Uses slug as name
    });

    it("limits results if requested", async () => {
      // Setup multiple favorite pipelines
      const favoritePipelineIds = [
        "testorg/frontend-service",
        "testorg/backend-api",
        "dataorg/data-processing",
      ];
      jest
        .spyOn(userPreferencesService, "getFavoritePipelines")
        .mockResolvedValue(favoritePipelineIds);

      const results = await searchService.getFavoritePipelines(2);

      expect(results.length).toBe(2);
    });
  });

  describe("getRecentPipelines", () => {
    it("returns recent pipelines from preferences", async () => {
      // Setup recent pipelines
      const recentPipelines = [
        {
          pipelineId: "testorg/frontend-service",
          lastVisited: Date.now(),
          visitCount: 5,
        },
        {
          pipelineId: "dataorg/data-processing",
          lastVisited: Date.now() - 1000,
          visitCount: 3,
        },
      ];
      jest
        .spyOn(userPreferencesService, "getRecentPipelines")
        .mockResolvedValue(recentPipelines);

      const results = await searchService.getRecentPipelines();

      expect(results.length).toBe(2);
      expect(results[0].name).toBe("Frontend Service");
      expect(results[1].organization).toBe("dataorg");
    });

    it("creates minimal pipeline objects for recents not in cache", async () => {
      // Setup recent that doesn't exist in the test pipelines
      const recentPipelines = [
        {
          pipelineId: "unknown-org/unknown-pipeline",
          lastVisited: Date.now(),
          visitCount: 1,
        },
      ];
      jest
        .spyOn(userPreferencesService, "getRecentPipelines")
        .mockResolvedValue(recentPipelines);
      jest.spyOn(pipelineService, "getPipeline").mockReturnValue(undefined);

      const results = await searchService.getRecentPipelines();

      expect(results.length).toBe(1);
      expect(results[0].organization).toBe("unknown-org");
      expect(results[0].slug).toBe("unknown-pipeline");
      expect(results[0].name).toBe("unknown-pipeline"); // Uses slug as name
    });

    it("limits results if requested", async () => {
      // Setup multiple recent pipelines
      const recentPipelines = [
        {
          pipelineId: "testorg/frontend-service",
          lastVisited: Date.now(),
          visitCount: 5,
        },
        {
          pipelineId: "testorg/backend-api",
          lastVisited: Date.now() - 1000,
          visitCount: 3,
        },
        {
          pipelineId: "dataorg/data-processing",
          lastVisited: Date.now() - 2000,
          visitCount: 1,
        },
      ];
      jest
        .spyOn(userPreferencesService, "getRecentPipelines")
        .mockResolvedValue(recentPipelines);

      const results = await searchService.getRecentPipelines(2);

      expect(results.length).toBe(2);
    });
  });
});
