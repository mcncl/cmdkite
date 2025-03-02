import { CommandManager } from "../commandManager";
import { commandRegistry } from "../commandRegistry";
import { Command } from "../../types";

// Mock the registry
jest.mock("../commandRegistry", () => {
  // Create a mock implementation
  const mockRegistry = {
    getCommand: jest.fn(),
    getAllCommands: jest.fn(),
    getAvailableCommands: jest.fn(),
  };

  return {
    commandRegistry: mockRegistry,
  };
});

describe("CommandManager", () => {
  let commandManager: CommandManager;

  // Sample test commands
  const testCommands: Command[] = [
    {
      id: "test-command-1",
      name: "Test Command 1",
      description: "Description for test command 1",
      keywords: ["test", "one"],
      execute: jest.fn(),
    },
    {
      id: "test-command-2",
      name: "Test Command 2",
      description: "Description for test command 2",
      keywords: ["test", "two"],
      execute: jest.fn(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    commandManager = new CommandManager();

    // Setup mock returns
    (commandRegistry.getAvailableCommands as jest.Mock).mockReturnValue(
      testCommands,
    );
    (commandRegistry.getCommand as jest.Mock).mockImplementation((id) => {
      return testCommands.find((cmd) => cmd.id === id);
    });
  });

  describe("getAllAvailableCommands", () => {
    it("should get available commands from registry", () => {
      const commands = commandManager.getAllAvailableCommands();

      expect(commandRegistry.getAvailableCommands).toHaveBeenCalled();
      expect(commands).toEqual(testCommands);
    });
  });

  describe("matchCommands", () => {
    it("should return all available commands for empty input", () => {
      const matches = commandManager.matchCommands("");

      expect(matches.length).toBe(2);
      expect(matches[0].command).toEqual(testCommands[0]);
      expect(matches[0].score).toBe(1);
    });

    it("should handle direct command reference with slash", () => {
      (commandRegistry.getCommand as jest.Mock).mockReturnValueOnce(
        testCommands[0],
      );

      const matches = commandManager.matchCommands("/test-command-1");

      expect(matches.length).toBe(1);
      expect(matches[0].command).toEqual(testCommands[0]);
      expect(matches[0].score).toBe(100);
    });

    it("should match commands based on input and sort by score", () => {
      // This test exercises the calculateMatchScore method
      const matches = commandManager.matchCommands("test");

      expect(matches.length).toBe(2);
      // Scores should be greater than 0
      expect(matches[0].score).toBeGreaterThan(0);
      expect(matches[1].score).toBeGreaterThan(0);
      // Results should be sorted by score in descending order
      expect(matches[0].score >= matches[1].score).toBe(true);
    });
  });

  describe("executeCommand", () => {
    it("should call the command's execute method", () => {
      const mockCommand = {
        id: "test",
        name: "Test",
        description: "Test",
        keywords: [],
        execute: jest.fn(),
      };

      commandManager.executeCommand(mockCommand, "test input");

      expect(mockCommand.execute).toHaveBeenCalledWith("test input");
    });
  });

  describe("getCommandById", () => {
    it("should get a command from the registry by id", () => {
      commandManager.getCommandById("test-command-1");

      expect(commandRegistry.getCommand).toHaveBeenCalledWith("test-command-1");
    });
  });
});
