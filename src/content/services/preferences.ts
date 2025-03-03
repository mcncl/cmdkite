import { Pipeline } from "../types";
import { Command } from "../types";

interface UserPreferences {
  recentPipelines: RecentPipeline[];
  favoritePipelines: string[];
  recentCommands: RecentCommand[];
  favoriteCommands: string[]; // Command IDs
  commandAliases: CommandAlias[];
  triggerKey: string;
  theme: "light" | "dark" | "system";
  defaultView: "recent" | "favorites" | "commands";
  maxResults: number;
  recentSearches: string[]; // For recent searches
}

interface RecentPipeline {
  pipelineId: string;
  lastVisited: number; // Timestamp
  visitCount: number;
}

interface RecentCommand {
  commandId: string;
  lastUsed: number; // Timestamp
  useCount: number;
}

interface CommandAlias {
  id: string; // Unique identifier for this alias
  name: string; // The alias name (what user types)
  commandId: string; // The actual command ID this maps to
  params?: string; // Optional default parameters
  description?: string; // Optional custom description
}

const DEFAULT_PREFERENCES: UserPreferences = {
  recentPipelines: [],
  favoritePipelines: [],
  recentCommands: [],
  favoriteCommands: [],
  commandAliases: [],
  triggerKey: "",
  theme: "system",
  defaultView: "recent",
  maxResults: 7,
  recentSearches: [],
};

// Maximum number of recent items to store
const MAX_RECENT_PIPELINES = 10;
const MAX_RECENT_COMMANDS = 10;
const MAX_COMMAND_ALIASES = 20;

export class UserPreferencesService {
  private preferences: UserPreferences = DEFAULT_PREFERENCES;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize preferences when service is created
    this.initPromise = this.loadPreferences();
  }

  private async loadPreferences(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get("userPreferences");
      if (result.userPreferences) {
        this.preferences = {
          ...DEFAULT_PREFERENCES,
          ...result.userPreferences,
        };
      }
      this.initialized = true;
    } catch (error) {
      console.error("Failed to load preferences:", error);
      this.initialized = true;
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      await chrome.storage.sync.set({ userPreferences: this.preferences });
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      await this.initPromise;
    } else {
      await this.loadPreferences();
    }
  }

  // Recent pipelines management
  public async addRecentPipeline(
    organization: string,
    slug: string,
  ): Promise<void> {
    await this.ensureInitialized();

    const pipelineId = `${organization}/${slug}`;
    const existingIndex = this.preferences.recentPipelines.findIndex(
      (p) => p.pipelineId === pipelineId,
    );

    if (existingIndex >= 0) {
      // Update existing entry
      const existing = this.preferences.recentPipelines[existingIndex];
      this.preferences.recentPipelines.splice(existingIndex, 1);
      this.preferences.recentPipelines.unshift({
        pipelineId,
        lastVisited: Date.now(),
        visitCount: existing.visitCount + 1,
      });
    } else {
      // Add new entry
      this.preferences.recentPipelines.unshift({
        pipelineId,
        lastVisited: Date.now(),
        visitCount: 1,
      });

      // Trim if exceeding max size
      if (this.preferences.recentPipelines.length > MAX_RECENT_PIPELINES) {
        this.preferences.recentPipelines =
          this.preferences.recentPipelines.slice(0, MAX_RECENT_PIPELINES);
      }
    }

    await this.savePreferences();
  }

  public async getRecentPipelines(): Promise<RecentPipeline[]> {
    await this.ensureInitialized();
    return [...this.preferences.recentPipelines];
  }

  public async clearRecentPipelines(): Promise<void> {
    await this.ensureInitialized();
    this.preferences.recentPipelines = [];
    await this.savePreferences();
  }

  // Recent searches management
  public async getRecentSearches(): Promise<string[]> {
    await this.ensureInitialized();
    return this.preferences.recentSearches || [];
  }

  public async setRecentSearches(searches: string[]): Promise<void> {
    await this.ensureInitialized();
    this.preferences.recentSearches = searches;
    await this.savePreferences();
  }

  public async clearRecentSearches(): Promise<void> {
    await this.ensureInitialized();
    this.preferences.recentSearches = [];
    await this.savePreferences();
  }

  // Favorite pipelines management
  public async toggleFavoritePipeline(
    organization: string,
    slug: string,
  ): Promise<boolean> {
    await this.ensureInitialized();

    const pipelineId = `${organization}/${slug}`;
    const isFavorite = this.preferences.favoritePipelines.includes(pipelineId);

    if (isFavorite) {
      // Remove from favorites
      this.preferences.favoritePipelines =
        this.preferences.favoritePipelines.filter((id) => id !== pipelineId);
    } else {
      // Add to favorites
      this.preferences.favoritePipelines.push(pipelineId);
    }

    await this.savePreferences();
    return !isFavorite; // Return new favorite status
  }

  public async isFavoritePipeline(
    organization: string,
    slug: string,
  ): Promise<boolean> {
    await this.ensureInitialized();
    return this.preferences.favoritePipelines.includes(
      `${organization}/${slug}`,
    );
  }

  public async getFavoritePipelines(): Promise<string[]> {
    await this.ensureInitialized();
    return [...this.preferences.favoritePipelines];
  }

  // ===== NEW COMMAND HISTORY FEATURES =====

  // Add a command to recent history
  public async addRecentCommand(commandId: string): Promise<void> {
    await this.ensureInitialized();

    const existingIndex = this.preferences.recentCommands.findIndex(
      (c) => c.commandId === commandId,
    );

    if (existingIndex >= 0) {
      // Update existing entry
      const existing = this.preferences.recentCommands[existingIndex];
      this.preferences.recentCommands.splice(existingIndex, 1);
      this.preferences.recentCommands.unshift({
        commandId,
        lastUsed: Date.now(),
        useCount: existing.useCount + 1,
      });
    } else {
      // Add new entry
      this.preferences.recentCommands.unshift({
        commandId,
        lastUsed: Date.now(),
        useCount: 1,
      });

      // Trim if exceeding max size
      if (this.preferences.recentCommands.length > MAX_RECENT_COMMANDS) {
        this.preferences.recentCommands = this.preferences.recentCommands.slice(
          0,
          MAX_RECENT_COMMANDS,
        );
      }
    }

    await this.savePreferences();
  }

  // Get recent commands
  public async getRecentCommands(): Promise<RecentCommand[]> {
    await this.ensureInitialized();
    return [...this.preferences.recentCommands];
  }

  // Clear recent commands
  public async clearRecentCommands(): Promise<void> {
    await this.ensureInitialized();
    this.preferences.recentCommands = [];
    await this.savePreferences();
  }

  // Toggle a command as favorite
  public async toggleFavoriteCommand(commandId: string): Promise<boolean> {
    await this.ensureInitialized();

    const isFavorite = this.preferences.favoriteCommands.includes(commandId);

    if (isFavorite) {
      // Remove from favorites
      this.preferences.favoriteCommands =
        this.preferences.favoriteCommands.filter((id) => id !== commandId);
    } else {
      // Add to favorites
      this.preferences.favoriteCommands.push(commandId);
    }

    await this.savePreferences();
    return !isFavorite; // Return new favorite status
  }

  // Check if a command is favorited
  public async isFavoriteCommand(commandId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.preferences.favoriteCommands.includes(commandId);
  }

  // Get all favorite commands
  public async getFavoriteCommands(): Promise<string[]> {
    await this.ensureInitialized();
    return [...this.preferences.favoriteCommands];
  }

  // ===== COMMAND ALIASES =====

  // Add or update command alias
  public async setCommandAlias(alias: CommandAlias): Promise<void> {
    await this.ensureInitialized();

    // Check if alias ID exists
    const existingIndex = this.preferences.commandAliases.findIndex(
      (a) => a.id === alias.id,
    );

    if (existingIndex >= 0) {
      // Update existing alias
      this.preferences.commandAliases[existingIndex] = alias;
    } else {
      // Add new alias
      this.preferences.commandAliases.push(alias);

      // Trim if exceeding max size
      if (this.preferences.commandAliases.length > MAX_COMMAND_ALIASES) {
        this.preferences.commandAliases = this.preferences.commandAliases.slice(
          0,
          MAX_COMMAND_ALIASES,
        );
      }
    }

    await this.savePreferences();
  }

  // Get all command aliases
  public async getCommandAliases(): Promise<CommandAlias[]> {
    await this.ensureInitialized();
    return [...this.preferences.commandAliases];
  }

  // Delete a command alias by ID
  public async deleteCommandAlias(aliasId: string): Promise<void> {
    await this.ensureInitialized();
    this.preferences.commandAliases = this.preferences.commandAliases.filter(
      (a) => a.id !== aliasId,
    );
    await this.savePreferences();
  }

  // Find alias by name (for lookup during command execution)
  public async findAliasByName(
    aliasName: string,
  ): Promise<CommandAlias | undefined> {
    await this.ensureInitialized();
    return this.preferences.commandAliases.find(
      (a) => a.name.toLowerCase() === aliasName.toLowerCase(),
    );
  }

  // Get aliases for a specific command ID
  public async getAliasesForCommand(
    commandId: string,
  ): Promise<CommandAlias[]> {
    await this.ensureInitialized();
    return this.preferences.commandAliases.filter(
      (a) => a.commandId === commandId,
    );
  }

  // General settings
  public async setTriggerKey(key: string): Promise<void> {
    await this.ensureInitialized();
    this.preferences.triggerKey = key;
    await this.savePreferences();
  }

  public async getTriggerKey(): Promise<string> {
    await this.ensureInitialized();
    return this.preferences.triggerKey;
  }

  public async setTheme(theme: "light" | "dark" | "system"): Promise<void> {
    await this.ensureInitialized();
    this.preferences.theme = theme;
    await this.savePreferences();
  }

  public async getTheme(): Promise<"light" | "dark" | "system"> {
    await this.ensureInitialized();
    return this.preferences.theme;
  }

  public async setDefaultView(
    view: "recent" | "favorites" | "commands",
  ): Promise<void> {
    await this.ensureInitialized();
    this.preferences.defaultView = view;
    await this.savePreferences();
  }

  public async getDefaultView(): Promise<"recent" | "favorites" | "commands"> {
    await this.ensureInitialized();
    return this.preferences.defaultView;
  }

  public async setMaxResults(max: number): Promise<void> {
    await this.ensureInitialized();
    this.preferences.maxResults = max;
    await this.savePreferences();
  }

  public async getMaxResults(): Promise<number> {
    await this.ensureInitialized();
    return this.preferences.maxResults;
  }
}

// Export a singleton instance
export const userPreferencesService = new UserPreferencesService();

// Export types for use in other files
export type { RecentPipeline, RecentCommand, CommandAlias };
