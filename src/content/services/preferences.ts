import { Pipeline } from "../types";

interface UserPreferences {
  recentPipelines: RecentPipeline[];
  favoritePipelines: string[];
  triggerKey: string;
  theme: "light" | "dark" | "system";
  defaultView: "recent" | "favorites" | "commands";
  maxResults: number;
  recentSearches: string[]; // New field for recent searches
}

interface RecentPipeline {
  pipelineId: string;
  lastVisited: number; // Timestamp
  visitCount: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  recentPipelines: [],
  favoritePipelines: [],
  triggerKey: "",
  theme: "system",
  defaultView: "recent",
  maxResults: 7,
  recentSearches: [], // Default empty array
};

// Maximum number of recent pipelines to store
const MAX_RECENT_PIPELINES = 10;

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

  // Recent searches management - new methods
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
