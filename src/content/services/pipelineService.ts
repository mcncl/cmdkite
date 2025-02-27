import { Pipeline, PipelineSuggestion } from "../types";
import { enhancedFuzzySearch } from "../util/search";

/**
 * Service for handling all pipeline-related operations.
 * Centralizes pipeline fetching, caching, and searching functionality.
 */
export class PipelineService {
  // Global cache for all pipelines
  private _pipelines: Pipeline[] = [];

  /**
   * Get the cached pipelines
   */
  public get pipelines(): Pipeline[] {
    return [...this._pipelines]; // Return a copy to prevent external modifications
  }

  /**
   * Fetch all available pipelines from the current page DOM.
   *
   * @returns Promise resolving to an array of pipelines
   */
  public async fetchPipelines(): Promise<Pipeline[]> {
    try {
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
        const metricElements = element.querySelectorAll(
          ".flex-column .truncate",
        );
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
      this._pipelines = pipelines;
      return pipelines;
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      return [];
    }
  }

  /**
   * Clear the pipeline cache
   */
  public clearCache(): void {
    this._pipelines = [];
  }

  /**
   * Get a pipeline by organization and slug
   *
   * @param organization Organization name
   * @param slug Pipeline slug
   * @returns Pipeline or undefined if not found
   */
  public getPipeline(organization: string, slug: string): Pipeline | undefined {
    return this._pipelines.find(
      (p) => p.organization === organization && p.slug === slug,
    );
  }

  /**
   * Ensure pipelines are loaded, fetching them if necessary
   *
   * @returns Promise resolving to boolean indicating success
   */
  public async ensurePipelinesLoaded(): Promise<boolean> {
    if (this._pipelines.length > 0) {
      return true;
    }

    try {
      const pipelines = await this.fetchPipelines();
      return pipelines.length > 0;
    } catch (error) {
      console.error("Failed to load pipelines:", error);
      return false;
    }
  }

  /**
   * Search for pipelines matching the given search term
   *
   * @param searchTerm Term to search for
   * @param limit Maximum number of results to return
   * @param ensureLoaded Whether to automatically fetch pipelines if none are cached
   * @returns Promise resolving to pipeline search results
   */
  public async searchPipelines(
    searchTerm: string,
    limit = 5,
    ensureLoaded = true,
  ): Promise<PipelineSuggestion[]> {
    // Return empty results for empty search term
    if (!searchTerm.trim()) {
      return [];
    }

    // Ensure pipelines are loaded if requested
    if (ensureLoaded && this._pipelines.length === 0) {
      await this.fetchPipelines();
    }

    // Still no pipelines after trying to load them
    if (this._pipelines.length === 0) {
      return [];
    }

    // Define fields to search with weights
    const searchFields = [
      { key: "name" as keyof Pipeline, weight: 1.5 }, // Name has highest weight
      { key: "slug" as keyof Pipeline, weight: 1.0 },
      { key: "organization" as keyof Pipeline, weight: 0.7 },
      { key: "description" as keyof Pipeline, weight: 0.5 },
    ];

    // Perform search using enhanced fuzzy search
    return this._pipelines
      .map((pipeline) => {
        // Create a combined field for full path
        const pipelineWithPath = {
          ...pipeline,
          fullPath: `${pipeline.organization}/${pipeline.slug}`,
        };

        // Use enhanced fuzzy search
        const score = enhancedFuzzySearch(pipelineWithPath, searchTerm, [
          ...searchFields,
          { key: "fullPath" as keyof typeof pipelineWithPath, weight: 1.2 },
        ]);

        return {
          pipeline,
          score,
        };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

// Export singleton instance
export const pipelineService = new PipelineService();
