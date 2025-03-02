// Import and initialize the command registration
import "./registration";

// Re-export individual commands for easy access
// Build commands
export { newBuildCommand } from "./build/new";

// Pipeline commands
export { goToPipelineCommand } from "./pipeline/pick";
export { newPipelineCommand } from "./pipeline/new";
export { listPipelineCommand } from "./pipeline/list";

// Organization commands
export { switchOrgCommand } from "./organization/switch";
export { orgSettingsCommand } from "./organization/settings";
