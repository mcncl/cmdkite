import { Command } from "../../types";
import { newPipelineCommand } from "./new";
import { goToPipelineCommand } from "./pick";
import { listPipelineCommand } from "./list";

export const pipelineCommands: Command[] = [
  goToPipelineCommand,
  newPipelineCommand,
  listPipelineCommand,
];

export {
  goToPipelineCommand,
  cachedPipelines,
  fetchPipelines,
  fuzzyMatch,
} from "./pick";

export { newPipelineCommand } from "./new";
