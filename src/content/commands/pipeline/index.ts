import { Command } from "../../types";
import { newPipelineCommand } from "./new";
import { goToPipelineCommand } from "./pick";

export const pipelineCommands: Command[] = [
  goToPipelineCommand,
  newPipelineCommand,
];

// Export utility functions and individual commands for use in other modules
export {
  goToPipelineCommand,
  // Export utility functions from pick.ts
  cachedPipelines,
  fetchPipelines,
  fuzzyMatch,
} from "./pick";

export { newPipelineCommand } from "./new";
