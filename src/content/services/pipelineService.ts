import { Pipeline, PipelineSuggestion } from "../types";
import { enhancedFuzzySearch } from "../util/search";
import { errorService, ErrorCategory, ErrorSeverity } from "./errorService";

/**
 * Service for handling all pipeline-related operations.
 * Centralizes pipeline fetching, caching, and searching functionality.
 */
export class PipelineService {
  // Global cache for all pipelines
  private _pipelines: Pipeline[] = [];
  private _lastFetchTime: number = 0;
  private _fetchPromise: Promise<Pipeline[]> | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

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
      // If we're already fetching, return the existing promise
      if (this._fetchPromise) {
        return this._fetchPromise;
      }

      // Create a new fetch promise
      this._fetchPromise = this._fetchPipelinesImpl();
      const result = await this._fetchPromise;

      // Clear the promise after it completes
      this._fetchPromise = null;
      return result;
    } catch (error) {
      // Clear the promise on error
      this._fetchPromise = null;

      // Log the error
      errorService.captureException(error, {
        message: "Failed to fetch pipelines from DOM",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.PIPELINE,
      });

      // Return empty array on failure
      return [];
    }
  }

  /**
   * Implementation of pipeline fetching logic
   */
  private async _fetchPipelinesImpl(): Promise<Pipeline[]> {
    try {
      // Get all pipeline elements using data-testid
      const pipelineElements = Array.from(
        document.querySelectorAll('[data-testid="pipeline"]'),
      );

      // If no pipeline elements are found, this might be a page without pipelines
      if (pipelineElements.length === 0) {
        errorService.logError(
          "No pipeline elements found in DOM",
          ErrorSeverity.INFO,
          ErrorCategory.PIPELINE,
          { url: window.location.href },
        );
      }

      const pipelines: Pipeline[] = [];

      // Try to extract pipeline data from each element
      pipelineElements.forEach((element, index) => {
        try {
          // Find the link within the pipeline element that contains the name and description
          const linkContainer = element.querySelector(".flex-auto a");
          if (!linkContainer) {
            throw new Error("Link container not found in pipeline element");
          }

          const href = linkContainer.getAttribute("href");
          if (!href) {
            throw new Error("Href not found in link container");
          }

          // Extract org and pipeline from href (format: /org/pipeline)
          const parts = href.replace("https://buildkite.com/", "").split("/");
          if (parts.length < 2) {
            throw new Error(`Invalid href format: ${href}`);
          }

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
        } catch (pipelineError) {
          // Log error for individual pipeline but continue processing others
          errorService.captureException(pipelineError, {
            message: `Failed to extract data for pipeline at index ${index}`,
            severity: ErrorSeverity.WARNING,
            category: ErrorCategory.PIPELINE,
          });
        }
      });

      // Cache the results
      this._pipelines = pipelines;
      this._lastFetchTime = Date.now();
      return pipelines;
    } catch (error) {
      // Propagate the error for central handling
      throw error;
    }
  }

  /**
   * Check if the cache needs refreshing
   */
  private isCacheStale(): boolean {
    return Date.now() - this._lastFetchTime > this.CACHE_TTL;
  }

  /**
   * Clear the pipeline cache
   */
  public clearCache(): void {
    this._pipelines = [];
    this._lastFetchTime = 0;
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
    try {
      if (this._pipelines.length > 0 && !this.isCacheStale()) {
        return true;
      }

      const pipelines = await this.fetchPipelines();
      return pipelines.length > 0;
    } catch (error) {
      errorService.captureException(error, {
        message: "Failed to ensure pipelines are loaded",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.PIPELINE,
      });
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
    try {
      // Return empty results for empty search term
      if (!searchTerm.trim()) {
        return [];
      }

      // Ensure pipelines are loaded if requested
      if (
        ensureLoaded &&
        (this._pipelines.length === 0 || this.isCacheStale())
      ) {
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
    } catch (error) {
      errorService.captureException(error, {
        message: "Error searching pipelines",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.PIPELINE,
        context: { searchTerm, limit },
      });

      // Return empty array on error
      return [];
    }
  }
}

// Export singleton instance
export const pipelineService = new PipelineService();
