import { commandRegistry } from "../services/commandRegistry";

// Import all commands directly
import { newBuildCommand } from "./build/new";
import { goToPipelineCommand } from "./pipeline/pick";
import { newPipelineCommand } from "./pipeline/new";
import { listPipelineCommand } from "./pipeline/list";
import { switchOrgCommand } from "./organization/switch";
import { orgSettingsCommand } from "./organization/settings";

/**
 * Register all commands with the registry
 */
export function registerAllCommands(): void {
  // Register each command directly
  const commands = [
    // Build commands
    newBuildCommand,

    // Pipeline commands
    goToPipelineCommand,
    newPipelineCommand,
    listPipelineCommand,

    // Organization commands
    switchOrgCommand,
    orgSettingsCommand,
  ];

  // Register all commands at once
  const registeredCount = commandRegistry.registerMany(commands);

  console.debug(`Registered ${registeredCount} commands`);
}

// Register commands immediately when this module is imported
registerAllCommands();
