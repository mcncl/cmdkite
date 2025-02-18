import { getOrganization } from "../../util/helpers";
import { Command } from "../../types";

export const newPipelineCommand: Command = {
  id: "new-pipeline",
  name: "Create New Pipeline",
  description: "Navigate to the new pipeline creation page",
  keywords: ["create", "new", "add", "pipeline", "setup"],
  execute: async (input?: string) => {
    let url = window.location.pathname;
    let orgSlug = getOrganization(url);

    window.location.href = `https://buildkite.com/organizations/${orgSlug}/pipelines/new`;
  },
};

export const newPipelineCommands: Command[] = [newPipelineCommand];
