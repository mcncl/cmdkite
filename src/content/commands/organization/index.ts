import { Command } from "../../types";
import { switchOrgCommand } from "./switch";
import { orgSettingsCommand } from "./settings";

export const organizationCommands: Command[] = [
  orgSettingsCommand,
  switchOrgCommand,
];
