import { getOrganization } from "../../util/helpers";
import { Command } from "../../types";

export const orgSettingsCommand: Command = {
  id: "organization.settings",
  name: "Organization Settings",
  description: "View and edit settings for the current Buildkite organization",
  keywords: ["organization", "settings"],
  isAvailable: (): boolean => {
    // This command is always available on Buildkite domains
    return window.location.hostname.includes("buildkite.com");
  },
  execute: () => {
    let url = window.location.pathname;
    let orgSlug = getOrganization(url);
    window.location.href = `https://buildkite.com/organizations/${orgSlug}/settings`;
  },
};
