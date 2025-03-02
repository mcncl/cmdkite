import { CommandRegistry } from "../commandRegistry";
import { Command } from "../../types";

describe("CommandRegistry", () => {
  let registry: CommandRegistry;

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
      isAvailable: () => true,
    },
    {
      id: "unavailable-command",
      name: "Unavailable Command",
      description: "This command is not available",
      keywords: ["unavailable"],
      execute: jest.fn(),
      isAvailable: () => false,
    },
  ];

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe("register", () => {
    it("should register a command successfully", () => {
      expect(registry.register(testCommands[0])).toBe(true);
      expect(registry.getCommand("test-command-1")).toEqual(testCommands[0]);
    });

    it("should not register a command with a duplicate id", () => {
      registry.register(testCommands[0]);

      // Mock console.warn to avoid test output noise
      const originalWarn = console.warn;
      console.warn = jest.fn();

      expect(registry.register(testCommands[0])).toBe(false);
      expect(console.warn).toHaveBeenCalled();

      // Restore original console.warn
      console.warn = originalWarn;
    });
  });

  describe("registerMany", () => {
    it("should register multiple commands", () => {
      expect(registry.registerMany(testCommands)).toBe(3);
      expect(registry.getAllCommands().length).toBe(3);
    });

    it("should return the count of successfully registered commands", () => {
      registry.register(testCommands[0]);

      // Mock console.warn to avoid test output noise
      const originalWarn = console.warn;
      console.warn = jest.fn();

      expect(registry.registerMany(testCommands)).toBe(2);

      // Restore original console.warn
      console.warn = originalWarn;
    });
  });

  describe("getCommand", () => {
    it("should return the correct command by id", () => {
      registry.register(testCommands[0]);
      const command = registry.getCommand("test-command-1");
      expect(command).toEqual(testCommands[0]);
    });

    it("should return undefined for non-existent command", () => {
      expect(registry.getCommand("non-existent")).toBeUndefined();
    });
  });

  describe("getAllCommands", () => {
    it("should return all registered commands", () => {
      registry.registerMany(testCommands);
      const commands = registry.getAllCommands();
      expect(commands.length).toBe(3);
      expect(commands).toEqual(expect.arrayContaining(testCommands));
    });

    it("should return an empty array when no commands are registered", () => {
      expect(registry.getAllCommands()).toEqual([]);
    });
  });

  describe("getAvailableCommands", () => {
    it("should return only available commands", () => {
      registry.registerMany(testCommands);
      const availableCommands = registry.getAvailableCommands();

      expect(availableCommands.length).toBe(2);
      expect(availableCommands).toContain(testCommands[0]);
      expect(availableCommands).toContain(testCommands[1]);
      expect(availableCommands).not.toContain(testCommands[2]);
    });
  });

  describe("clear", () => {
    it("should remove all registered commands", () => {
      registry.registerMany(testCommands);
      expect(registry.getAllCommands().length).toBe(3);

      registry.clear();
      expect(registry.getAllCommands().length).toBe(0);
    });
  });
});
