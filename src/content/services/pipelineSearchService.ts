import { Pipeline } from "../types";
import { cachedPipelines, fetchPipelines } from "../commands/pipeline";
import { fuzzyMatch, enhancedFuzzySearch } from "../util/search";

export interface PipelineSearchResult {
  pipeline: Pipeline;
  score: number;
}

/**
 * A service for searching pipelines using fuzzy matching.
 */
export class PipelineSearchService {
  /**
   * Search for pipelines that match the given search term.
   *
   * @param searchTerm The term to search for
   * @param limit Maximum number of results to return
   * @param ensureLoaded Whether to fetch pipelines if none are cached
   * @returns A promise that resolves to an array of pipeline search results
   */
  public async searchPipelines(
    searchTerm: string,
    limit = 5,
    ensureLoaded = true,
  ): Promise<PipelineSearchResult[]> {
    // Return empty results for empty search term
    if (!searchTerm.trim()) {
      return [];
    }

    // Ensure pipelines are loaded if requested
    if (ensureLoaded && cachedPipelines.length === 0) {
      try {
        await fetchPipelines();
      } catch (error) {
        console.error("Error fetching pipelines:", error);
        return [];
      }
    }

    // Still no pipelines after trying to load them
    if (cachedPipelines.length === 0) {
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
    return cachedPipelines
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

  /**
   * Simpler search implementation that uses the basic fuzzy match algorithm.
   * This is kept for backwards compatibility with existing code patterns.
   *
   * @param searchTerm The term to search for
   * @param limit Maximum number of results to return
   * @returns An array of pipeline search results
   */
  public simpleFuzzySearch(
    searchTerm: string,
    limit = 5,
  ): PipelineSearchResult[] {
    if (!searchTerm.trim() || cachedPipelines.length === 0) {
      return [];
    }

    return cachedPipelines
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
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

// Export singleton instance
export const pipelineSearchService = new PipelineSearchService();
