import { searchService } from "../../../services/searchService";
import {
  userPreferencesService,
  CommandAlias,
} from "../../../services/preferences";
import { commandRegistry } from "../../../services/commandRegistry";

// Mock the dependencies
jest.mock("../../../services/preferences", () => ({
  userPreferencesService: {
    getCommandAliases: jest.fn(),
    setCommandAlias: jest.fn(),
    deleteCommandAlias: jest.fn(),
    findAliasByName: jest.fn(),
    getAliasesForCommand: jest.fn(),
  },
}));

jest.mock("../../../services/commandRegistry", () => ({
  commandRegistry: {
    getCommand: jest.fn(),
    getAllAvailableCommands: jest.fn(),
  },
}));

// Sample test data
const testCommands = [
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
    description: "Create a new build for a pipeline",
    keywords: ["build", "deploy"],
    execute: jest.fn(),
  },
];

const testAliases: CommandAlias[] = [
  {
    id: "alias-1",
    name: "go",
    commandId: "pipeline",
    params: "frontend-service",
    description: "Go to frontend service pipeline",
  },
  {
    id: "alias-2",
    name: "build",
    commandId: "new-build",
    params: "frontend-service",
  },
];

describe("Command Aliases in SearchService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementation
    (userPreferencesService.getCommandAliases as jest.Mock).mockResolvedValue(
      testAliases,
    );
    (commandRegistry.getCommand as jest.Mock).mockImplementation((id) => {
      return testCommands.find((cmd) => cmd.id === id);
    });
    (commandRegistry.getAllAvailableCommands as jest.Mock).mockReturnValue(
      testCommands,
    );
  });

  it("should load command aliases on initialization", async () => {
    // Create a new instance to trigger alias loading
    const service = new (searchService.constructor as any)();

    // Wait for promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(userPreferencesService.getCommandAliases).toHaveBeenCalled();
  });

  it("should find exact alias matches when searching with slash prefix", async () => {
    // Force reload aliases before test
    await searchService.refreshCommandAliases();

    const results = await searchService.searchCommands("/go");

    expect(results.length).toBe(1);
    expect(results[0].command.id).toBe("pipeline");
    expect(results[0].alias).toBeDefined();
    expect(results[0].alias!.name).toBe("go");
    expect(results[0].score).toBe(100);
  });

  it("should include alias default parameters", async () => {
    // Force reload aliases before test
    await searchService.refreshCommandAliases();

    const results = await searchService.searchCommands("/go");

    expect(results[0].inputParams).toBe("frontend-service");
  });

  it("should override alias parameters with user input", async () => {
    // Force reload aliases before test
    await searchService.refreshCommandAliases();

    const results = await searchService.searchCommands("/go backend-api");

    expect(results[0].inputParams).toBe("backend-api");
  });

  it("should also find aliases by fuzzy matching", async () => {
    // Force reload aliases before test
    await searchService.refreshCommandAliases();

    // Search without the slash prefix
    const results = await searchService.searchCommands("go");

    // Should find both the command "Go to Pipeline" and the alias "go"
    expect(results.length).toBeGreaterThan(0);

    // At least one result should be the alias
    const aliasMatch = results.find((r) => r.alias?.name === "go");
    expect(aliasMatch).toBeDefined();
  });

  it("should refresh aliases when requested", async () => {
    await searchService.refreshCommandAliases();

    expect(userPreferencesService.getCommandAliases).toHaveBeenCalled();
  });

  it("should execute commands with alias parameters", async () => {
    // Force reload aliases before test
    await searchService.refreshCommandAliases();

    // Find the alias first
    const results = await searchService.searchCommands("/build");
    const match = results[0];

    // Execute the command through the alias
    await searchService.executeCommand(match.command, match.inputParams);

    // Verify the command was executed with the alias parameters
    expect(testCommands[1].execute).toHaveBeenCalledWith("frontend-service");
  });
});
