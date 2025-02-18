import { Command } from "../types";
import { pipelineCommands } from "./pipeline";
import { organizationCommands } from "./organization";
import { buildCommands } from "./build";

export const allCommands: Command[] = [
  ...buildCommands,
  ...pipelineCommands,
  ...organizationCommands,
];
