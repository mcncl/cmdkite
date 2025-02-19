import { Command } from "../../types";

export const switchOrgCommand: Command = {
  id: "org",
  name: "Switch Organization",
  description:
    "Switch to a different Buildkite organization (type organization slug)",
  keywords: ["organization", "switch", "org"],
  isAvailable: (): boolean => {
    // This command is always available on Buildkite domains
    return window.location.hostname.includes("buildkite.com");
  },
  execute: (input?: string) => {
    // If no input is provided, show the current org
    if (!input || !input.trim()) {
      // Just refresh the current page
      window.location.reload();
      return;
    }

    // Use input directly as org slug
    const orgSlug = input.trim();
    window.location.href = `https://buildkite.com/${orgSlug}`;
  },
};
