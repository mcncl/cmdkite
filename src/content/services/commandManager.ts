import { Command, CommandMatch } from "../types";
import { allCommands } from "../commands";

export class CommandManager {
  private commands: Command[];

  constructor() {
    this.commands = allCommands;
  }

  /**
   * Get all available commands (those that pass their isAvailable check)
   */
  public getAllAvailableCommands(): Command[] {
    return this.commands.filter((cmd) => !cmd.isAvailable || cmd.isAvailable());
  }

  /**
   * Match commands based on input
   * @param input User input to match against commands
   * @returns Array of command matches with scores
   */
  public matchCommands(input: string): CommandMatch[] {
    // Skip matching if input is empty
    if (!input.trim()) {
      return this.getAllAvailableCommands().map((cmd) => ({
        command: cmd,
        score: 1,
      }));
    }

    const inputLower = input.toLowerCase().trim();

    // Check if using command ID direct reference (with slash)
    if (inputLower.startsWith("/")) {
      const commandId = inputLower.slice(1);
      const directMatches = this.commands
        .filter(
          (cmd) =>
            (!cmd.isAvailable || cmd.isAvailable()) && cmd.id === commandId,
        )
        .map((cmd) => ({ command: cmd, score: 100 }));

      if (directMatches.length > 0) {
        return directMatches;
      }
    }

    // Split input for more advanced matching patterns
    const words = inputLower.split(/\s+/);
    const firstWord = words[0];

    return this.commands
      .filter((cmd) => !cmd.isAvailable || cmd.isAvailable())
      .map((cmd) => ({
        command: cmd,
        score: this.calculateMatchScore(inputLower, firstWord, words, cmd),
      }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate match score between input and command
   * Higher scores indicate better matches
   */
  private calculateMatchScore(
    fullInput: string,
    firstWord: string,
    words: string[],
    command: Command,
  ): number {
    let score = 0;
    const commandIdLower = command.id.toLowerCase();
    const commandNameLower = command.name.toLowerCase();
    const descriptionLower = command.description.toLowerCase();

    // Direct matches are highest priority
    if (commandIdLower === fullInput) {
      return 100;
    }

    if (commandNameLower === fullInput) {
      return 90;
    }

    // Command ID partial matches
    if (commandIdLower.startsWith(fullInput)) {
      score += 70;
    } else if (commandIdLower.includes(fullInput)) {
      score += 60;
    }

    // Command name matches
    if (commandNameLower.startsWith(fullInput)) {
      score += 50;
    } else if (commandNameLower.includes(fullInput)) {
      score += 40;
    }

    // First word exact matches (important for command discovery)
    if (
      commandIdLower.startsWith(firstWord) ||
      commandNameLower.startsWith(firstWord)
    ) {
      score += 30;
    }

    // Multi-word matching (each word that matches adds points)
    let wordMatchCount = 0;
    for (const word of words) {
      if (word.length < 2) continue; // Skip very short words

      if (
        commandIdLower.includes(word) ||
        commandNameLower.includes(word) ||
        descriptionLower.includes(word)
      ) {
        wordMatchCount++;
      }

      // Check keywords too
      if (command.keywords.some((k) => k.toLowerCase().includes(word))) {
        wordMatchCount++;
      }
    }

    // Add points for word matches
    score += wordMatchCount * 10;

    // Keyword exact matches
    if (command.keywords.some((k) => k.toLowerCase() === fullInput)) {
      score += 30;
    }

    // Keyword partial matches
    if (command.keywords.some((k) => k.toLowerCase().includes(fullInput))) {
      score += 20;
    }

    // Description matches (lowest priority)
    if (descriptionLower.includes(fullInput)) {
      score += 10;
    }

    return score;
  }

  /**
   * Execute a command with optional input
   */
  public executeCommand(command: Command, input?: string): void {
    command.execute(input);
  }

  /**
   * Find a command by its ID
   */
  public getCommandById(id: string): Command | undefined {
    return this.commands.find((cmd) => cmd.id === id);
  }
}
