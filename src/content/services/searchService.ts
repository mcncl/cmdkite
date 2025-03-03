import { Command, CommandMatch, Pipeline, PipelineSuggestion } from "../types";
import { fuzzyMatch, enhancedFuzzySearch } from "../util/search";
import { userPreferencesService, CommandAlias } from "../services/preferences";
import { pipelineService } from "./pipelineService";
import { CommandManager } from "./commandManager";
import { errorService, ErrorCategory, ErrorSeverity } from "./errorService";

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
  private commandAliases: CommandAlias[] = [];
  private aliasesLoaded = false;

  constructor(commandManager?: CommandManager) {
    // Use dependency injection with a fallback
    this.commandManager = commandManager || new CommandManager();

    // Wrap initialization in a try-catch to prevent breaking tests
    this.loadRecentSearches().catch(console.error);

    // Load command aliases
    this.loadCommandAliases().catch(console.error);
  }

  /**
   * Load command aliases from user preferences
   */
  private async loadCommandAliases(): Promise<void> {
    try {
      if (this.aliasesLoaded) return;

      const aliases = await userPreferencesService.getCommandAliases();
      this.commandAliases = aliases || [];
      this.aliasesLoaded = true;
    } catch (error) {
      errorService.captureException(error, {
        message: "Failed to load command aliases",
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.INITIALIZATION,
      });
      this.commandAliases = [];
      this.aliasesLoaded = true;
    }
  }

  /**
   * Reload command aliases (called after alias changes)
   */
  public async refreshCommandAliases(): Promise<void> {
    this.aliasesLoaded = false;
    await this.loadCommandAliases();
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
      errorService.captureException(error, {
        message: "Failed to load recent searches",
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.INITIALIZATION,
      });
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
      errorService.captureException(error, {
        message: "Failed to save recent searches",
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.STORAGE,
      });
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
   * Search for commands (and aliases) that match the given query
   *
   * @param query User input to match against commands and aliases
   * @returns Array of command matches with scores
   */
  public async searchCommands(query: string): Promise<CommandMatch[]> {
    // Ensure aliases are loaded
    await this.loadCommandAliases();

    // If query is empty, return all available commands
    if (!query.trim()) {
      return this.commandManager.getAllAvailableCommands().map((cmd) => ({
        command: cmd,
        score: 1,
      }));
    }

    const inputLower = query.toLowerCase().trim();
    let results: CommandMatch[] = [];

    // Check if it's a direct command or alias reference with slash
    if (inputLower.startsWith("/")) {
      const identifier = inputLower.slice(1).split(/\s+/)[0]; // Get the first word after slash

      // First check for alias match
      const aliasMatch = this.commandAliases.find(
        (alias) => alias.name.toLowerCase() === identifier,
      );

      if (aliasMatch) {
        const command = this.commandManager.getCommandById(
          aliasMatch.commandId,
        );

        if (command && (!command.isAvailable || command.isAvailable())) {
          return [
            {
              command,
              score: 100,
              // Include alias details so we know this was matched via an alias
              alias: aliasMatch,
              // Extract any additional input after the alias
              inputParams: query
                .trim()
                .slice(identifier.length + 1)
                .trim(),
            },
          ];
        }
      }

      // Then check for direct command match
      const command = this.commandManager.getCommandById(identifier);
      if (command && (!command.isAvailable || command.isAvailable())) {
        return [
          {
            command,
            score: 100,
            // Extract any additional input after the command ID
            inputParams: query
              .trim()
              .slice(identifier.length + 1)
              .trim(),
          },
        ];
      }
    }

    // For non-exact matches, search both commands and aliases
    const commands = this.commandManager.getAllAvailableCommands();

    // Score and filter commands
    const commandMatches = commands
      .map((cmd) => ({
        command: cmd,
        score: this.calculateCommandMatchScore(inputLower, cmd),
      }))
      .filter((match) => match.score > 0);

    // Score and filter aliases
    const aliasMatches = this.commandAliases
      .filter((alias) => {
        // Only include aliases for commands that exist and are available
        const cmd = this.commandManager.getCommandById(alias.commandId);
        return cmd && (!cmd.isAvailable || cmd.isAvailable());
      })
      .map((alias) => {
        // Get the actual command this alias refers to
        const command = this.commandManager.getCommandById(alias.commandId);
        if (!command) return null;

        // Calculate match score for the alias
        let score = 0;

        // Direct alias name match (highest priority)
        if (alias.name.toLowerCase() === inputLower) {
          score = 95; // Just below exact command match
        }
        // Alias starts with input
        else if (alias.name.toLowerCase().startsWith(inputLower)) {
          score = 85;
        }
        // Alias contains input
        else if (alias.name.toLowerCase().includes(inputLower)) {
          score = 75;
        }
        // Check custom description if available
        else if (
          alias.description &&
          alias.description.toLowerCase().includes(inputLower)
        ) {
          score = 65;
        }

        return score > 0
          ? {
              command,
              score,
              alias,
              // Add any default params defined for this alias
              inputParams: alias.params || "",
            }
          : null;
      })
      .filter((match): match is CommandMatch => match !== null);

    // Combine matches and sort by score
    results = [...commandMatches, ...aliasMatches].sort(
      (a, b) => b.score - a.score,
    );

    return results;
  }

  /**
   * Calculate a match score between the input and a command
   *
   * @param input The search input
   * @param command The command to score against
   * @returns Score indicating match quality
   */
  private calculateCommandMatchScore(input: string, command: Command): number {
    const words = input.split(/\s+/);
    const firstWord = words[0];
    let score = 0;

    const commandIdLower = command.id.toLowerCase();
    const commandNameLower = command.name.toLowerCase();
    const descriptionLower = command.description.toLowerCase();

    // Direct matches are highest priority
    if (commandIdLower === input) {
      return 100;
    }

    if (commandNameLower === input) {
      return 90;
    }

    // Command ID partial matches
    if (commandIdLower.startsWith(input)) {
      score += 70;
    } else if (commandIdLower.includes(input)) {
      score += 60;
    }

    // Command name matches
    if (commandNameLower.startsWith(input)) {
      score += 50;
    } else if (commandNameLower.includes(input)) {
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
    if (command.keywords.some((k) => k.toLowerCase() === input)) {
      score += 30;
    }

    // Keyword partial matches
    if (command.keywords.some((k) => k.toLowerCase().includes(input))) {
      score += 20;
    }

    // Description matches (lowest priority)
    if (descriptionLower.includes(input)) {
      score += 10;
    }

    return score;
  }

  /**
   * Execute a command with optional input
   *
   * @param command The command to execute
   * @param input Optional input parameters
   * @param saveHistory Whether to save this to command history
   */
  public async executeCommand(
    command: Command,
    input?: string,
    saveHistory: boolean = true,
  ): Promise<void> {
    if (!command || typeof command.execute !== "function") {
      errorService.logError(
        "Invalid command or missing execute method",
        ErrorSeverity.ERROR,
        ErrorCategory.COMMAND,
        { commandId: command?.id },
      );
      return;
    }

    try {
      // Only record history for successful command executions
      if (saveHistory) {
        await userPreferencesService.addRecentCommand(command.id);
      }

      // Execute the actual command
      command.execute(input);
    } catch (error) {
      errorService.captureException(error, {
        message: `Error executing command: ${command.id}`,
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.COMMAND,
        context: { commandId: command.id, input },
      });
    }
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
        errorService.captureException(error, {
          message: "Error fetching pipelines during search",
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.PIPELINE,
          context: { query },
        });
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
      errorService.captureException(error, {
        message: "Error loading favorite pipelines",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.PIPELINE,
      });
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
      errorService.captureException(error, {
        message: "Error loading recent pipelines",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.PIPELINE,
      });
      return [];
    }
  }

  /**
   * Get favorite commands
   *
   * @returns Array of favorite Command objects
   */
  public async getFavoriteCommands(): Promise<Command[]> {
    try {
      const favoriteIds = await userPreferencesService.getFavoriteCommands();
      const commands: Command[] = [];

      for (const commandId of favoriteIds) {
        const command = this.commandManager.getCommandById(commandId);

        if (command && (!command.isAvailable || command.isAvailable())) {
          commands.push(command);
        }
      }

      return commands;
    } catch (error) {
      errorService.captureException(error, {
        message: "Error loading favorite commands",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.COMMAND,
      });
      return [];
    }
  }

  /**
   * Get recent commands
   *
   * @param limit Maximum number of recent commands to return
   * @returns Array of {command, useCount} objects
   */
  public async getRecentCommands(
    limit?: number,
  ): Promise<Array<{ command: Command; useCount: number }>> {
    try {
      const recentCommandsData =
        await userPreferencesService.getRecentCommands();
      const commands: Array<{ command: Command; useCount: number }> = [];

      for (const commandData of recentCommandsData) {
        const command = this.commandManager.getCommandById(
          commandData.commandId,
        );

        if (command && (!command.isAvailable || command.isAvailable())) {
          commands.push({
            command,
            useCount: commandData.useCount,
          });
        }
      }

      return limit ? commands.slice(0, limit) : commands;
    } catch (error) {
      errorService.captureException(error, {
        message: "Error loading recent commands",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.COMMAND,
      });
      return [];
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();
