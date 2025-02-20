import { getOrganization } from "../../util/helpers";
import { Command } from "../../types";

export const listPipelineCommand: Command = {
  id: "list-pipelines",
  name: "View all Pipelines",
  description: "View all pipelines for the current Buildkite organization",
  keywords: ["list", "view", "show", "pipelines"],
  execute: async (input?: string) => {
    let url = window.location.pathname;
    let orgSlug = getOrganization(url);

    window.location.href = `https://buildkite.com/${orgSlug}`;
  },
};
