import { Command, CommandMatch } from "../types";
import { allCommands } from "../commands";

export class CommandManager {
  private commands: Command[];

  constructor() {
    this.commands = allCommands;
  }

  matchCommands(input: string): CommandMatch[] {
    const [command, ...args] = input.toLowerCase().trim().split(" ");

    return this.commands
      .filter((cmd) => !cmd.isAvailable || cmd.isAvailable())
      .map((cmd) => ({
        command: cmd,
        score: this.calculateMatchScore(command, cmd),
      }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private calculateMatchScore(input: string, command: Command): number {
    if (input.length < 2) return 0;

    let score = 0;

    // Exact matches with command name
    if (command.name.toLowerCase().includes(input)) {
      score += 3;
    }

    // Keyword matches
    if (command.keywords.some((k) => k.toLowerCase().includes(input))) {
      score += 2;
    }

    // Partial matches with description
    if (command.description.toLowerCase().includes(input)) {
      score += 1;
    }

    return score;
  }

  executeCommand(command: Command, input?: string) {
    command.execute(input);
  }
}
