import {
  Command,
  CommandMatch,
  Pipeline,
  PipelineSuggestion,
} from "../../types";
import { fuzzyMatch, enhancedFuzzySearch } from "../../util/search";
import { userPreferencesService, CommandAlias } from "../preferences";
import { pipelineService } from "../pipelineService";
import { CommandManager } from "../commandManager";
import { PrefixTrie } from "./trie";
import { errorService, ErrorCategory, ErrorSeverity } from "../errorService";

/**
 * Maximum number of recent searches to store
 */
const MAX_RECENT_SEARCHES = 10;

// Structure for caching search results
interface SearchCache<T> {
  query: string;
  results: T[];
  timestamp: number;
}

// Create singleton instance
let instance: SearchService | null = null;

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
  private initPromise: Promise<void> | null = null;
  private initialized = false;

  // Cache for search results
  private commandSearchCache: SearchCache<CommandMatch> | null = null;
  private pipelineSearchCache: Map<string, SearchCache<PipelineSuggestion>> =
    new Map();

  // Cache TTL in milliseconds (5 seconds)
  private readonly CACHE_TTL = 5000;

  // Prefix trie for command search acceleration
  private commandTrie: PrefixTrie = new PrefixTrie();
  private trieInitialized = false;

  /**
   * Get the singleton instance of SearchService
   */
  public static getInstance(): SearchService {
    if (!instance) {
      instance = new SearchService();
    }
    return instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(commandManager?: CommandManager) {
    // Use dependency injection with a fallback
    this.commandManager = commandManager || new CommandManager();

    // Initialize in the background
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the search service
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load recent searches and command aliases in parallel
      await Promise.all([this.loadRecentSearches(), this.loadCommandAliases()]);

      // Initialize command trie in the background
      this.initCommandTrie().catch((error) => {
        errorService.captureException(error, {
          message: "Failed to initialize command trie",
          severity: ErrorSeverity.WARNING,
          category: ErrorCategory.INITIALIZATION,
        });
      });

      this.initialized = true;
    } catch (error) {
      errorService.captureException(error, {
        message: "Failed to initialize search service",
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.INITIALIZATION,
      });

      // Set initialized to true anyway to avoid repeated initialization attempts
      this.initialized = true;
    }
  }

  /**
   * Ensure the service is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
    } else {
      this.initPromise = this.initialize();
      await this.initPromise;
    }
  }

  /**
   * Initialize the prefix trie with command data
   */
  private async initCommandTrie(): Promise<void> {
    if (this.trieInitialized) return;

    try {
      // Get all available commands
      const commands = this.commandManager.getAllAvailableCommands();

      // Add each command to the trie
      for (const command of commands) {
        // Add command ID
        this.commandTrie.insert(command.id, command);

        // Add command name (words)
        const nameWords = command.name.toLowerCase().split(/\s+/);
        for (const word of nameWords) {
          if (word.length > 1) {
            this.commandTrie.insert(word, command);
          }
        }

        // Add keywords
        for (const keyword of command.keywords) {
          this.commandTrie.insert(keyword.toLowerCase(), command);
        }
      }

      // Also add command aliases if loaded
      if (this.aliasesLoaded) {
        for (const alias of this.commandAliases) {
          const command = this.commandManager.getCommandById(alias.commandId);
          if (command) {
            this.commandTrie.insert(alias.name.toLowerCase(), command);
          }
        }
      }

      this.trieInitialized = true;
    } catch (error) {
      errorService.captureException(error, {
        message: "Failed to initialize command trie",
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.INITIALIZATION,
      });
    }
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

      // Initialize trie with new aliases if trie was already initialized
      if (this.trieInitialized) {
        // Clear and rebuild trie
        this.commandTrie = new PrefixTrie();
        this.trieInitialized = false;
        await this.initCommandTrie();
      }
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

    // Reset command trie to rebuild with new aliases
    this.commandTrie = new PrefixTrie();
    this.trieInitialized = false;

    // Clear command search cache
    this.commandSearchCache = null;
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

    await this.ensureInitialized();

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
    await this.ensureInitialized();
    return [...this.recentSearches];
  }

  /**
   * Clear recent searches
   */
  public async clearRecentSearches(): Promise<void> {
    await this.ensureInitialized();
    this.recentSearches = [];
    await userPreferencesService.setRecentSearches([]);
  }

  /**
   * Check if command search cache is valid
   */
  private isCommandCacheValid(query: string): boolean {
    if (!this.commandSearchCache) return false;

    // Check if cache is for the same query
    if (this.commandSearchCache.query !== query) return false;

    // Check if cache is still fresh
    const now = Date.now();
    return now - this.commandSearchCache.timestamp < this.CACHE_TTL;
  }

  /**
   * Check if pipeline search cache is valid
   */
  private isPipelineCacheValid(query: string): boolean {
    const cache = this.pipelineSearchCache.get(query);
    if (!cache) return false;

    // Check if cache is still fresh
    const now = Date.now();
    return now - cache.timestamp < this.CACHE_TTL;
  }

  /**
   * Search for commands (and aliases) that match the given query
   * Uses caching and prefix trie for optimization
   *
   * @param query User input to match against commands and aliases
   * @param limit Maximum number of results to return (optional)
   * @returns Array of command matches with scores
   */
  public async searchCommands(query: string, limit?: number): Promise<CommandMatch[]> {
    await this.ensureInitialized();

    // If query is empty, return limited available commands
    if (!query.trim()) {
      const allCommands = this.commandManager.getAllAvailableCommands().map((cmd) => ({
        command: cmd,
        score: 1,
      }));
      
      return limit ? allCommands.slice(0, limit) : allCommands;
    }

    // Check cache first - this is critical for performance
    if (this.isCommandCacheValid(query)) {
      return [...this.commandSearchCache!.results];
    }

    // Special handling for very short queries (1 character)
    // Return a small, fixed set to prevent UI freezing
    if (query.trim().length === 1) {
      // Get just the top commands that start with this character
      const inputChar = query.trim().toLowerCase()[0];
      const quickResults: CommandMatch[] = [];
      
      // Get at most 10 commands that start with this character
      const availableCommands = this.commandManager.getAllAvailableCommands();
      for (const cmd of availableCommands) {
        if (cmd.id.toLowerCase().startsWith(inputChar)) {
          quickResults.push({ command: cmd, score: 80 });
          if (quickResults.length >= 10) break;
        }
      }
      
      // Cache these results
      this.commandSearchCache = {
        query,
        results: [...quickResults],
        timestamp: Date.now(),
      };
      
      return quickResults;
    }

    // Ensure trie is initialized
    if (!this.trieInitialized) {
      await this.initCommandTrie();
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
          const result = [
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

          // Update cache
          this.commandSearchCache = {
            query,
            results: result,
            timestamp: Date.now(),
          };

          return result;
        }
      }

      // Then check for direct command match
      const command = this.commandManager.getCommandById(identifier);
      if (command && (!command.isAvailable || command.isAvailable())) {
        const result = [
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

        // Update cache
        this.commandSearchCache = {
          query,
          results: result,
          timestamp: Date.now(),
        };

        return result;
      }
    }

    // For faster search on short queries, start with trie-based matches
    if (inputLower.length <= 3) {
      // Get matches from trie
      const matches = this.commandTrie.search(inputLower);

      // Convert to command matches - limit processing for very short queries
      for (const command of matches) {
        // Only include available commands
        if (!command.isAvailable || command.isAvailable()) {
          // For 2-3 char queries, use a simplified scoring to improve performance
          let score = 0;
          if (inputLower.length <= 2) {
            // Use simplified scoring for very short queries
            if (command.id.toLowerCase().startsWith(inputLower)) {
              score = 80;
            } else if (command.name.toLowerCase().startsWith(inputLower)) {
              score = 70;
            } else {
              score = 60; // Any match gets a minimum score
            }
          } else {
            // Use full scoring for 3-char queries
            score = this.calculateCommandMatchScore(inputLower, command);
          }
          
          if (score > 0) {
            results.push({ command, score });
            
            // Limit to 20 results for very short queries to improve performance
            if (inputLower.length <= 2 && results.length >= 20) {
              break;
            }
          }
        }
      }
    } else {
      // For longer queries, use full text search
      const commands = this.commandManager.getAllAvailableCommands();

      // Score and filter commands
      results = commands
        .map((cmd) => ({
          command: cmd,
          score: this.calculateCommandMatchScore(inputLower, cmd),
        }))
        .filter((match) => match.score > 0);
    }

    // Define the type for alias matches
    type AliasCommandMatch = {
      command: Command;
      score: number;
      alias: CommandAlias;
      inputParams: string;
    };

    // Skip alias matching for very short queries to improve performance
    let aliasMatches: AliasCommandMatch[] = [];
    if (inputLower.length > 2) {
      // Score and filter aliases
      aliasMatches = this.commandAliases
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
        .filter((match): match is AliasCommandMatch => match !== null);
    }

    // Combine matches and sort by score
    results = [...results, ...aliasMatches].sort((a, b) => b.score - a.score);

    // Update cache with full results
    this.commandSearchCache = {
      query,
      results: [...results], // Create a copy to prevent cache mutation
      timestamp: Date.now(),
    };

    // Return limited results if limit is specified
    return limit ? results.slice(0, limit) : results;
  }

  /**
   * Calculate a match score between the input and a command - optimized version
   * This version is more performance-focused and avoids excessive string operations
   *
   * @param input The search input
   * @param command The command to score against
   * @returns Score indicating match quality
   */
  private calculateCommandMatchScore(input: string, command: Command): number {
    // Skip processing for empty input
    if (!input) return 0;
    
    // Cache these values to avoid repeated toLowerCase() calls
    const commandIdLower = command.id.toLowerCase();
    const commandNameLower = command.name.toLowerCase();
    
    // Direct matches are highest priority - fast path
    if (commandIdLower === input) {
      return 100;
    }

    if (commandNameLower === input) {
      return 90;
    }
    
    let score = 0;

    // Command ID partial matches (highest priority after exact)
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
    
    // Early return for high-scoring matches to avoid unnecessary processing
    if (score >= 60) {
      return score;
    }
    
    // Skip more complex processing for short queries to improve performance
    if (input.length < 3) {
      return score;
    }
    
    // For multi-word search, split and process each word
    const words = input.split(/\s+/);
    if (words.length > 1) {
      const firstWord = words[0];
      
      // First word exact matches (important for command discovery)
      if (
        commandIdLower.startsWith(firstWord) ||
        commandNameLower.startsWith(firstWord)
      ) {
        score += 30;
      }
      
      // Multi-word matching - simplified to save processing time
      const validWords = words.filter(word => word.length >= 2);
      const wordMatchCount = validWords.filter(word => 
        commandIdLower.includes(word) || 
        commandNameLower.includes(word) ||
        command.description.toLowerCase().includes(word) ||
        command.keywords.some(k => k.toLowerCase().includes(word))
      ).length;
      
      // Add points for word matches
      score += wordMatchCount * 10;
    } else {
      // Only do keyword and description checks for single word searches
      
      // Keyword exact/partial matches
      const keywordMatch = command.keywords.find(k => {
        const kLower = k.toLowerCase();
        return kLower === input || kLower.includes(input);
      });
      
      if (keywordMatch) {
        score += keywordMatch.toLowerCase() === input ? 30 : 20;
      }
      
      // Description matches (lowest priority)
      if (command.description.toLowerCase().includes(input)) {
        score += 10;
      }
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
    await this.ensureInitialized();

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
   * Search for pipelines matching the given query with caching
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
    await this.ensureInitialized();

    // Return empty results for empty search term
    if (!query.trim()) {
      return [];
    }

    // Check cache first
    if (this.isPipelineCacheValid(query)) {
      const cache = this.pipelineSearchCache.get(query)!;

      // If limit is the same or larger, return all cached results
      if (cache.results.length <= limit) {
        return [...cache.results];
      }

      // Otherwise return limited results
      return [...cache.results.slice(0, limit)];
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
    const results = pipelineService.pipelines
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
      .sort((a, b) => b.score - a.score);

    // Update cache with unlimited results for future use
    this.pipelineSearchCache.set(query, {
      query,
      results: [...results],
      timestamp: Date.now(),
    });

    // Return only the requested limit
    return results.slice(0, limit);
  }

  /**
   * Get favorite pipelines from user preferences
   *
   * @param limit Maximum number of results to return
   * @returns Promise resolving to array of pipelines
   */
  public async getFavoritePipelines(limit?: number): Promise<Pipeline[]> {
    await this.ensureInitialized();

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
    await this.ensureInitialized();

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
    await this.ensureInitialized();

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
    await this.ensureInitialized();

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

  /**
   * Clear all caches to force fresh data to be loaded
   */
  public clearCaches(): void {
    this.commandSearchCache = null;
    this.pipelineSearchCache.clear();
  }
}

// Export the singleton accessor
export const searchService = SearchService.getInstance();
