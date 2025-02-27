import { Command } from "../../types";
import { fuzzyMatch } from "../../util/search";
import { pipelineSearchService } from "../../services/pipelineSearchService";

interface Pipeline {
  organization: string;
  slug: string;
  name: string;
  description: string;
  emoji?: string;
  reliability?: string;
  speed?: string;
}

// Export this so other commands can use it
export let cachedPipelines: Pipeline[] = [];

// Export this for use in other commands
export async function fetchPipelines(): Promise<Pipeline[]> {
  // Get all pipeline elements using data-testid
  const pipelineElements = Array.from(
    document.querySelectorAll('[data-testid="pipeline"]'),
  );

  const pipelines: Pipeline[] = [];

  pipelineElements.forEach((element) => {
    // Find the link within the pipeline element that contains the name and description
    const linkContainer = element.querySelector(".flex-auto a");
    if (!linkContainer) return;

    const href = linkContainer.getAttribute("href");
    if (!href) return;

    // Extract org and pipeline from href (format: /org/pipeline)
    const parts = href.replace("https://buildkite.com/", "").split("/");
    if (parts.length < 2) return;

    const organization = parts[0];
    const slug = parts[1];

    // Get the pipeline name from the title attribute
    const nameElement = linkContainer.querySelector("h2 span[title]");
    const name = nameElement?.getAttribute("title") || slug;

    // Get the description
    const descriptionElement = linkContainer.querySelector(
      ".text-sm.regular[title]",
    );
    const description = descriptionElement?.getAttribute("title") || "";

    // Get emoji if present
    const emojiElement = element.querySelector(
      '[data-testid="emoji-avatar-base"] .leading-none',
    );
    const emoji = emojiElement?.getAttribute("title")?.trim() || null;

    // Get metrics if present
    const metrics: Record<string, string> = {};
    const metricElements = element.querySelectorAll(".flex-column .truncate");
    metricElements.forEach((metricContainer) => {
      const label = metricContainer
        .querySelector(".dark-gray")
        ?.textContent?.trim();
      const value = metricContainer
        .querySelector(".text-2xl")
        ?.textContent?.trim();
      if (label && value) {
        metrics[label.toLowerCase()] = value;
      }
    });

    pipelines.push({
      organization,
      slug,
      name,
      description,
      emoji: emoji || undefined,
      reliability: metrics.reliability,
      speed: metrics.speed,
    });
  });

  // Cache the results
  cachedPipelines = pipelines;
  return pipelines;
}

// Export the fuzzyMatch function from our search utility
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
    if (cachedPipelines.length === 0) {
      await fetchPipelines();
    }

    // Search for matching pipelines using our search service
    const searchTerm = input.toLowerCase();
    const matchingPipelines = await pipelineSearchService.searchPipelines(
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
