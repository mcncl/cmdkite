import { Command } from "../../types";
import { pipelineService } from "../../services/pipelineService";

// Export this so other commands can continue using it for backwards compatibility
export const cachedPipelines = {
  get: () => pipelineService.pipelines,
};

// Export the fetchPipelines function for backward compatibility
export async function fetchPipelines() {
  return pipelineService.fetchPipelines();
}

// Export fuzzyMatch from the search utility for backward compatibility
export { fuzzyMatch } from "../../util/search";

export const goToPipelineCommand: Command = {
  id: "pipeline",
  name: "Go to Pipeline",
  description:
    "Navigate to a specific pipeline (type to search available pipelines)",
  keywords: ["pipeline", "goto"],
  execute: async (input?: string) => {
    if (!input) return;

    // Ensure we have pipeline data
    await pipelineService.ensurePipelinesLoaded();

    // Search for matching pipelines using our service
    const searchTerm = input.toLowerCase();
    const matchingPipelines = await pipelineService.searchPipelines(
      searchTerm,
      5,
    );

    if (matchingPipelines.length > 0) {
      const bestMatch = matchingPipelines[0].pipeline;
      window.location.href = `https://buildkite.com/${bestMatch.organization}/${bestMatch.slug}`;
    } else {
      // Fallback to direct navigation if no match found
      const parts = input.split("/");
      let org = window.location.pathname.split("/")[1]; // Default to current org
      let pipelineSlug = parts[0];

      if (parts.length > 1) {
        org = parts[0];
        pipelineSlug = parts[1];
      }

      window.location.href = `https://buildkite.com/${org}/${pipelineSlug}`;
    }
  },
};
