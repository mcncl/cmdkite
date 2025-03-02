import { Command } from "../types";

/**
 * Registry for managing all available commands in the application.
 * Provides a central place to register, retrieve, and search for commands.
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map();

  /**
   * Register a new command
   * @param command The command to register
   * @returns True if registration was successful, false if a command with the same ID already exists
   */
  public register(command: Command): boolean {
    if (this.commands.has(command.id)) {
      console.warn(`Command with ID "${command.id}" is already registered.`);
      return false;
    }

    this.commands.set(command.id, command);
    return true;
  }

  /**
   * Register multiple commands at once
   * @param commands Array of commands to register
   * @returns Number of successfully registered commands
   */
  public registerMany(commands: Command[]): number {
    let successCount = 0;

    for (const command of commands) {
      if (this.register(command)) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * Get a command by its ID
   * @param id The command ID
   * @returns The command if found, undefined otherwise
   */
  public getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  /**
   * Get all registered commands
   * @returns Array of all commands
   */
  public getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get all available commands (those that pass their isAvailable check)
   * @returns Array of available commands
   */
  public getAvailableCommands(): Command[] {
    return Array.from(this.commands.values()).filter(
      (cmd) => !cmd.isAvailable || cmd.isAvailable(),
    );
  }

  /**
   * Clear all registered commands
   */
  public clear(): void {
    this.commands.clear();
  }
}

// Export a singleton instance
export const commandRegistry = new CommandRegistry();
