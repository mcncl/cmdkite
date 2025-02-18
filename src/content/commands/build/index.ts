import { Command } from "../../types";
import { newBuildCommand } from "./new";

export const buildCommands: Command[] = [newBuildCommand];

// Also export individual commands for direct use in other modules
export { newBuildCommand };
