import { Command } from "../../types";
import { cachedPipelines, fetchPipelines, fuzzyMatch } from "../pipeline";

export const newBuildCommand: Command = {
  id: "new-build",
  name: "Create New Build",
  description: "Navigate to create a new build for a pipeline",
  keywords: ["build", "run", "start", "deploy", "trigger"],
  // Only show this command on pipeline pages or when we have pipelines loaded
  isAvailable: (): boolean => {
    // Check if we're on a pipeline page
    const pathParts = window.location.pathname.split("/");
    const isPipelinePage =
      pathParts.length >= 3 &&
      Boolean(pathParts[1]) &&
      Boolean(pathParts[2]) &&
      !String(pathParts[2]).includes("new");

    // Consider this command available if we're on a pipeline page
    return Boolean(isPipelinePage);
  },
  execute: async (input?: string) => {
    // If no input is provided, use the current pipeline
    if (!input || !input.trim()) {
      const pathParts = window.location.pathname.split("/");

      // We should be on a pipeline page if this command is available
      if (pathParts.length >= 3 && pathParts[1] && pathParts[2]) {
        const org = pathParts[1];
        const pipeline = pathParts[2];
        window.location.href = `https://buildkite.com/organizations/${org}/pipelines/${pipeline}/builds/new`;
      }
      return;
    }

    // If input is provided, try to find a matching pipeline
    // First ensure pipeline data is fetched
    if (cachedPipelines.length === 0) {
      await fetchPipelines();
    }

    // Find matching pipeline using the provided input
    const searchTerm = input.toLowerCase();
    const matchingPipelines = cachedPipelines
      .map((pipeline) => {
        const nameScore = fuzzyMatch(pipeline.name, searchTerm) * 1.5;
        const slugScore = fuzzyMatch(pipeline.slug, searchTerm);
        const fullPathScore = fuzzyMatch(
          `${pipeline.organization}/${pipeline.slug}`,
          searchTerm,
        );

        return {
          pipeline,
          score: Math.max(nameScore, slugScore, fullPathScore),
        };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);

    if (matchingPipelines.length > 0) {
      const bestMatch = matchingPipelines[0].pipeline;
      window.location.href = `https://buildkite.com/organizations/${bestMatch.organization}/pipelines/${bestMatch.slug}/builds/new`;
    } else {
      // Handle direct input
      const parts = input.split("/");
      let org = window.location.pathname.split("/")[1];
      let pipelineSlug = parts[0];

      if (parts.length > 1) {
        org = parts[0];
        pipelineSlug = parts[1];
      }

      window.location.href = `https://buildkite.com/organizations/${org}/pipelines/${pipelineSlug}/builds/new`;
    }
  },
};

export const newBuildCommands: Command[] = [newBuildCommand];
