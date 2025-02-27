import { Command } from "../../types";
import { newPipelineCommand } from "./new";
import { goToPipelineCommand } from "./pick";
import { listPipelineCommand } from "./list";
import { cachedPipelines, fetchPipelines, fuzzyMatch } from "./backwardCompat";

export const pipelineCommands: Command[] = [
  goToPipelineCommand,
  newPipelineCommand,
  listPipelineCommand,
];

// Export backward compatible exports
export { goToPipelineCommand, cachedPipelines, fetchPipelines, fuzzyMatch };

export { newPipelineCommand } from "./new";
