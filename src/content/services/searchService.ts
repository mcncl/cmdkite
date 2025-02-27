import { Command, CommandMatch, Pipeline, PipelineSuggestion } from "../types";
import { fuzzyMatch, enhancedFuzzySearch } from "../util/search";
import { userPreferencesService } from "./preferences";
import { pipelineService } from "./pipelineService";
import { CommandManager } from "./commandManager";

/**
 * Maximum number of recent searches to store
 */
const MAX_RECENT_SEARCHES = 10;

/**
 * Service for centralized search functionality across the application.
 * Handles searching commands, pipelines, and managing search history.
 */
export class SearchService {
  private commandManager: CommandManager;
  private recentSearches: string[] = [];
  private recentSearchesLoaded = false;

  constructor(commandManager?: CommandManager) {
    // Use dependency injection with a fallback
    this.commandManager = commandManager || new CommandManager();

    // Wrap initialization in a try-catch to prevent breaking tests
    this.loadRecentSearches().catch(console.error);
  }

  /**
   * Load recent searches from user preferences
   */
  private async loadRecentSearches(): Promise<void> {
    try {
      // Only load once
      if (this.recentSearchesLoaded) return;

      // Get recent searches from preferences service
      const prefs = await userPreferencesService.getRecentSearches();
      this.recentSearches = prefs || [];
      this.recentSearchesLoaded = true;
    } catch (error) {
      console.error("Failed to load recent searches:", error);
      this.recentSearches = [];
      this.recentSearchesLoaded = true;
    }
  }

  /**
   * Save a search term to recent searches
   *
   * @param query The search term to save
   */
  public async saveRecentSearch(query: string): Promise<void> {
    // Don't save empty queries
    if (!query.trim()) return;

    // Ensure recent searches are loaded
    await this.loadRecentSearches();

    // Remove if already exists (to move to front)
    this.recentSearches = this.recentSearches.filter(
      (term) => term.toLowerCase() !== query.toLowerCase(),
    );

    // Add to front of array
    this.recentSearches.unshift(query);

    // Trim to max size
    if (this.recentSearches.length > MAX_RECENT_SEARCHES) {
      this.recentSearches = this.recentSearches.slice(0, MAX_RECENT_SEARCHES);
    }

    // Save to preferences
    try {
      await userPreferencesService.setRecentSearches(this.recentSearches);
    } catch (error) {
      console.error("Failed to save recent searches:", error);
    }
  }

  /**
   * Get recent searches
   *
   * @returns Array of recent search terms
   */
  public async getRecentSearches(): Promise<string[]> {
    await this.loadRecentSearches();
    return [...this.recentSearches];
  }

  /**
   * Clear recent searches
   */
  public async clearRecentSearches(): Promise<void> {
    this.recentSearches = [];
    await userPreferencesService.setRecentSearches([]);
  }

  /**
   * Search for commands that match the given query
   *
   * @param query The search term
   * @returns Array of command matches sorted by relevance
   */
  public searchCommands(query: string): CommandMatch[] {
    // If query is empty, return all available commands
    if (!query.trim()) {
      return this.commandManager.getAllAvailableCommands().map((command) => ({
        command,
        score: 1,
      }));
    }

    // Check if it's a direct command reference with slash
    if (query.startsWith("/")) {
      const commandId = query.slice(1);
      const directMatches = this.commandManager
        .getAllAvailableCommands()
        .filter((cmd) => cmd.id === commandId)
        .map((cmd) => ({ command: cmd, score: 100 }));

      if (directMatches.length > 0) {
        return directMatches;
      }
    }

    // Split input for more advanced matching patterns
    const queryLower = query.toLowerCase().trim();
    const words = queryLower.split(/\s+/);
    const firstWord = words[0];

    return this.commandManager
      .getAllAvailableCommands()
      .map((command) => ({
        command,
        score: this.calculateCommandMatchScore(
          queryLower,
          firstWord,
          words,
          command,
        ),
      }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Execute a specific command
   *
   * @param command The command to execute
   * @param input Optional input parameters for the command
   */
  public executeCommand(command: Command, input?: string): void {
    if (!command || typeof command.execute !== "function") {
      console.error("Invalid command or missing execute method");
      return;
    }

    try {
      command.execute(input);
    } catch (error) {
      console.error("Error executing command:", error);
    }
  }

  /**
   * Calculate a match score between a query and a command
   *
   * @param fullInput The full search query
   * @param firstWord The first word of the query
   * @param words All words in the query
   * @param command The command to score
   * @returns A number indicating the quality of the match
   */
  private calculateCommandMatchScore(
    fullInput: string,
    firstWord: string,
    words: string[],
    command: Command,
  ): number {
    let score = 0;
    const commandIdLower = command.id.toLowerCase();
    const commandNameLower = command.name.toLowerCase();
    const descriptionLower = command.description.toLowerCase();

    // Direct matches are highest priority
    if (commandIdLower === fullInput) {
      return 100;
    }

    if (commandNameLower === fullInput) {
      return 90;
    }

    // Command ID partial matches
    if (commandIdLower.startsWith(fullInput)) {
      score += 70;
    } else if (commandIdLower.includes(fullInput)) {
      score += 60;
    }

    // Command name matches
    if (commandNameLower.startsWith(fullInput)) {
      score += 50;
    } else if (commandNameLower.includes(fullInput)) {
      score += 40;
    }

    // First word exact matches (important for command discovery)
    if (
      commandIdLower.startsWith(firstWord) ||
      commandNameLower.startsWith(firstWord)
    ) {
      score += 30;
    }

    // Multi-word matching (each word that matches adds points)
    let wordMatchCount = 0;
    for (const word of words) {
      if (word.length < 2) continue; // Skip very short words

      if (
        commandIdLower.includes(word) ||
        commandNameLower.includes(word) ||
        descriptionLower.includes(word)
      ) {
        wordMatchCount++;
      }

      // Check keywords too
      if (command.keywords.some((k) => k.toLowerCase().includes(word))) {
        wordMatchCount++;
      }
    }

    // Add points for word matches
    score += wordMatchCount * 10;

    // Keyword exact matches
    if (command.keywords.some((k) => k.toLowerCase() === fullInput)) {
      score += 30;
    }

    // Keyword partial matches
    if (command.keywords.some((k) => k.toLowerCase().includes(fullInput))) {
      score += 20;
    }

    // Description matches (lowest priority)
    if (descriptionLower.includes(fullInput)) {
      score += 10;
    }

    return score;
  }

  /**
   * Search for pipelines matching the given query
   *
   * @param query The search term
   * @param limit Maximum number of results to return
   * @param ensureLoaded Whether to automatically fetch pipelines if none are cached
   * @returns Promise resolving to pipeline search results
   */
  public async searchPipelines(
    query: string,
    limit = 5,
    ensureLoaded = true,
  ): Promise<PipelineSuggestion[]> {
    // Return empty results for empty search term
    if (!query.trim()) {
      return [];
    }

    // Try to save the search (async, don't await)
    this.saveRecentSearch(query).catch((err) =>
      console.error("Error saving recent search:", err),
    );

    // Ensure pipelines are loaded if requested
    if (ensureLoaded && pipelineService.pipelines.length === 0) {
      try {
        await pipelineService.fetchPipelines();
      } catch (error) {
        console.error("Error fetching pipelines:", error);
        return [];
      }
    }

    // Define fields to search with weights
    const searchFields = [
      { key: "name" as keyof Pipeline, weight: 1.5 }, // Name has highest weight
      { key: "slug" as keyof Pipeline, weight: 1.0 },
      { key: "organization" as keyof Pipeline, weight: 0.7 },
      { key: "description" as keyof Pipeline, weight: 0.5 },
    ];

    // For empty pipeline cache, return empty results
    if (pipelineService.pipelines.length === 0) {
      return [];
    }

    // Perform search using enhanced fuzzy search
    return pipelineService.pipelines
      .map((pipeline) => {
        // Create a combined field for full path
        const pipelineWithPath = {
          ...pipeline,
          fullPath: `${pipeline.organization}/${pipeline.slug}`,
        };

        // Use enhanced fuzzy search
        const score = enhancedFuzzySearch(pipelineWithPath, query, [
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
   * Get favorite pipelines from user preferences
   *
   * @param limit Maximum number of results to return
   * @returns Promise resolving to array of pipelines
   */
  public async getFavoritePipelines(limit?: number): Promise<Pipeline[]> {
    try {
      // Ensure pipelines are loaded
      await pipelineService.ensurePipelinesLoaded();

      // Get favorite pipeline IDs
      const favoritePipelineIds =
        await userPreferencesService.getFavoritePipelines();

      // Map favorite IDs to actual pipeline objects
      const favoriteItems: Pipeline[] = [];

      for (const pipelineId of favoritePipelineIds) {
        const [org, slug] = pipelineId.split("/");

        // Try to find in cached pipelines first
        let pipeline = pipelineService.getPipeline(org, slug);

        // If not found, create a minimal pipeline object
        if (!pipeline) {
          pipeline = {
            organization: org,
            slug: slug,
            name: slug, // Use slug as name if real name unknown
            description: `${org}/${slug}`,
          };
        }

        favoriteItems.push(pipeline);
      }

      return limit ? favoriteItems.slice(0, limit) : favoriteItems;
    } catch (error) {
      console.error("Error loading favorite pipelines:", error);
      return [];
    }
  }

  /**
   * Get recent pipelines from user preferences
   *
   * @param limit Maximum number of results to return
   * @returns Promise resolving to array of pipelines
   */
  public async getRecentPipelines(limit?: number): Promise<Pipeline[]> {
    try {
      // Ensure pipelines are loaded
      await pipelineService.ensurePipelinesLoaded();

      // Get recent pipeline IDs
      const recentPipelineData =
        await userPreferencesService.getRecentPipelines();

      // Map recent IDs to actual pipeline objects
      const recentItems: Pipeline[] = [];

      for (const recent of recentPipelineData) {
        const [org, slug] = recent.pipelineId.split("/");

        // Try to find in cached pipelines first
        let pipeline = pipelineService.getPipeline(org, slug);

        // If not found, create a minimal pipeline object
        if (!pipeline) {
          pipeline = {
            organization: org,
            slug: slug,
            name: slug, // Use slug as name if real name unknown
            description: `${org}/${slug}`,
          };
        }

        recentItems.push(pipeline);
      }

      return limit ? recentItems.slice(0, limit) : recentItems;
    } catch (error) {
      console.error("Error loading recent pipelines:", error);
      return [];
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();
