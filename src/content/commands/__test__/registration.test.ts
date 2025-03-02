import { commandRegistry } from "../../services/commandRegistry";
import { registerAllCommands } from "../registration";

// Mock the command registry
jest.mock("../../services/commandRegistry", () => {
  return {
    commandRegistry: {
      registerMany: jest.fn().mockReturnValue(6),
    },
  };
});

// Mock the command imports
jest.mock("../build/new", () => ({
  newBuildCommand: { id: "new-build" },
}));

jest.mock("../pipeline/pick", () => ({
  goToPipelineCommand: { id: "pipeline" },
}));

jest.mock("../pipeline/new", () => ({
  newPipelineCommand: { id: "new-pipeline" },
}));

jest.mock("../pipeline/list", () => ({
  listPipelineCommand: { id: "list-pipelines" },
}));

jest.mock("../organization/switch", () => ({
  switchOrgCommand: { id: "org" },
}));

jest.mock("../organization/settings", () => ({
  orgSettingsCommand: { id: "organization.settings" },
}));

describe("Command Registration", () => {
  // Save console.debug to restore it later
  const originalConsoleDebug = console.debug;

  beforeAll(() => {
    // Mock console.debug to avoid noise in test output
    console.debug = jest.fn();
  });

  afterAll(() => {
    // Restore original console.debug
    console.debug = originalConsoleDebug;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register all commands with the registry", () => {
    registerAllCommands();

    expect(commandRegistry.registerMany).toHaveBeenCalledTimes(1);
    expect(commandRegistry.registerMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        { id: "new-build" },
        { id: "pipeline" },
        { id: "new-pipeline" },
        { id: "list-pipelines" },
        { id: "org" },
        { id: "organization.settings" },
      ]),
    );
  });

  it("should log the number of registered commands", () => {
    registerAllCommands();

    expect(console.debug).toHaveBeenCalledWith("Registered 6 commands");
  });
});
