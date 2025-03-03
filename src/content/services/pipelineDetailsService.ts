import { Pipeline } from "../types";
import { errorService, ErrorCategory, ErrorSeverity } from "./errorService";

/**
 * Build status types
 */
export enum BuildStatus {
  PASSED = "passed",
  FAILED = "failed",
  RUNNING = "running",
  SCHEDULED = "scheduled",
  CANCELED = "canceled",
  UNKNOWN = "unknown",
}

/**
 * Build information interface
 */
export interface BuildInfo {
  id: string;
  number: number;
  status: BuildStatus;
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number; // in seconds
  commit?: string;
  branch?: string;
  message?: string;
  createdBy?: string;
}

/**
 * Pipeline stats interface
 */
export interface PipelineStats {
  buildCount: number;
  successRate: number; // 0-1 value
  avgDuration: number; // in seconds
  lastBuildStatus: BuildStatus;
  lastBuildTime?: Date;
  trend: "improving" | "declining" | "stable" | "unknown";
  buildFrequency: number; // average builds per day
}

/**
 * Cache entry for pipeline details
 */
interface PipelineDetailsCache {
  pipeline: Pipeline;
  builds: BuildInfo[];
  stats: PipelineStats;
  lastUpdated: number;
}

/**
 * Service for fetching and managing detailed pipeline information
 */
export class PipelineDetailsService {
  private static instance: PipelineDetailsService;
  private pipelineCache: Map<string, PipelineDetailsCache> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Private constructor to enforce singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PipelineDetailsService {
    if (!PipelineDetailsService.instance) {
      PipelineDetailsService.instance = new PipelineDetailsService();
    }
    return PipelineDetailsService.instance;
  }

  /**
   * Get cache key for a pipeline
   */
  private getPipelineCacheKey(organization: string, slug: string): string {
    return `${organization}/${slug}`;
  }

  /**
   * Check if cache entry is stale
   */
  private isCacheStale(cacheEntry: PipelineDetailsCache): boolean {
    return Date.now() - cacheEntry.lastUpdated > this.CACHE_TTL;
  }

  /**
   * Get build status from DOM elements
   */
  private getBuildStatusFromDom(statusElement: Element): BuildStatus {
    if (!statusElement) return BuildStatus.UNKNOWN;

    const classNames = statusElement.className || "";
    const textContent = statusElement.textContent?.trim().toLowerCase() || "";

    if (classNames.includes("passed") || textContent.includes("passed")) {
      return BuildStatus.PASSED;
    } else if (classNames.includes("failed") || textContent.includes("failed")) {
      return BuildStatus.FAILED;
    } else if (classNames.includes("running") || textContent.includes("running")) {
      return BuildStatus.RUNNING;
    } else if (classNames.includes("scheduled") || textContent.includes("scheduled")) {
      return BuildStatus.SCHEDULED;
    } else if (classNames.includes("canceled") || textContent.includes("canceled")) {
      return BuildStatus.CANCELED;
    }

    return BuildStatus.UNKNOWN;
  }

  /**
   * Parse duration string to seconds
   */
  private parseDuration(durationText: string): number {
    if (!durationText) return 0;
    
    // Handle "5m 30s" format
    const minutesMatch = durationText.match(/(\d+)m/);
    const secondsMatch = durationText.match(/(\d+)s/);
    
    let totalSeconds = 0;
    if (minutesMatch && minutesMatch[1]) {
      totalSeconds += parseInt(minutesMatch[1], 10) * 60;
    }
    if (secondsMatch && secondsMatch[1]) {
      totalSeconds += parseInt(secondsMatch[1], 10);
    }
    
    // If no matches, try parsing as just seconds
    if (totalSeconds === 0) {
      const justNumber = parseInt(durationText.replace(/[^\d]/g, ''), 10);
      if (!isNaN(justNumber)) {
        totalSeconds = justNumber;
      }
    }
    
    return totalSeconds;
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    
    try {
      // Try parsing as ISO string
      return new Date(dateStr);
    } catch (e) {
      // If that fails, try relative time parsing
      const now = new Date();
      
      // Handle "5 minutes ago" format
      const minutesMatch = dateStr.match(/(\d+)\s+minute(s)?\s+ago/i);
      if (minutesMatch && minutesMatch[1]) {
        const minutes = parseInt(minutesMatch[1], 10);
        return new Date(now.getTime() - minutes * 60 * 1000);
      }
      
      // Handle "2 hours ago" format
      const hoursMatch = dateStr.match(/(\d+)\s+hour(s)?\s+ago/i);
      if (hoursMatch && hoursMatch[1]) {
        const hours = parseInt(hoursMatch[1], 10);
        return new Date(now.getTime() - hours * 60 * 60 * 1000);
      }
      
      // Handle "1 day ago" format
      const daysMatch = dateStr.match(/(\d+)\s+day(s)?\s+ago/i);
      if (daysMatch && daysMatch[1]) {
        const days = parseInt(daysMatch[1], 10);
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }
      
      return undefined;
    }
  }

  /**
   * Calculate pipeline stats from build data
   */
  private calculateStats(builds: BuildInfo[]): PipelineStats {
    if (!builds.length) {
      return {
        buildCount: 0,
        successRate: 0,
        avgDuration: 0,
        lastBuildStatus: BuildStatus.UNKNOWN,
        trend: "unknown",
        buildFrequency: 0,
      };
    }

    // Sort builds by number (most recent first)
    const sortedBuilds = [...builds].sort((a, b) => b.number - a.number);
    
    // Calculate success rate
    const completedBuilds = sortedBuilds.filter(
      b => b.status === BuildStatus.PASSED || b.status === BuildStatus.FAILED
    );
    const successfulBuilds = completedBuilds.filter(
      b => b.status === BuildStatus.PASSED
    );
    const successRate = completedBuilds.length > 0 
      ? successfulBuilds.length / completedBuilds.length 
      : 0;
    
    // Calculate average duration
    const buildsWithDuration = sortedBuilds.filter(b => typeof b.duration === 'number');
    const avgDuration = buildsWithDuration.length > 0
      ? buildsWithDuration.reduce((sum, b) => sum + (b.duration || 0), 0) / buildsWithDuration.length
      : 0;
    
    // Determine trend by comparing recent success rate to overall
    let trend: "improving" | "declining" | "stable" | "unknown" = "unknown";
    if (completedBuilds.length >= 5) {
      const recentBuilds = completedBuilds.slice(0, Math.min(5, Math.ceil(completedBuilds.length / 2)));
      const recentSuccessRate = recentBuilds.filter(b => b.status === BuildStatus.PASSED).length / recentBuilds.length;
      
      if (Math.abs(recentSuccessRate - successRate) < 0.1) {
        trend = "stable";
      } else if (recentSuccessRate > successRate) {
        trend = "improving";
      } else {
        trend = "declining";
      }
    }
    
    // Calculate build frequency (builds per day)
    let buildFrequency = 0;
    if (sortedBuilds.length >= 2) {
      const newest = sortedBuilds[0].startedAt || new Date();
      const oldest = sortedBuilds[sortedBuilds.length - 1].startedAt;
      
      if (oldest) {
        const daysDiff = (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 0) {
          buildFrequency = sortedBuilds.length / daysDiff;
        }
      }
    }
    
    return {
      buildCount: builds.length,
      successRate,
      avgDuration,
      lastBuildStatus: sortedBuilds[0]?.status || BuildStatus.UNKNOWN,
      lastBuildTime: sortedBuilds[0]?.finishedAt || sortedBuilds[0]?.startedAt,
      trend,
      buildFrequency,
    };
  }

  /**
   * Fetch pipeline builds and details
   */
  private async fetchPipelineDetails(
    organization: string,
    slug: string
  ): Promise<{builds: BuildInfo[], stats: PipelineStats}> {
    try {
      // Fetch pipeline page to extract build data
      const response = await fetch(`https://buildkite.com/${organization}/${slug}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch pipeline page: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Create a temporary DOM element to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract build information from the page
      const buildElements = Array.from(doc.querySelectorAll('[data-testid="build"]'));
      
      const builds: BuildInfo[] = buildElements.map((elem, index) => {
        try {
          // Extract build number
          const buildNumberElem = elem.querySelector('[data-testid="build-number"]');
          const buildNumber = buildNumberElem 
            ? parseInt(buildNumberElem.textContent?.replace('#', '') || '0', 10)
            : index;
            
          // Extract build status
          const statusElem = elem.querySelector('[data-testid="build-status"]');
          const status = this.getBuildStatusFromDom(statusElem || elem);
          
          // Extract build times
          const timeElems = elem.querySelectorAll('.relative-time');
          let startedAt: Date | undefined;
          let finishedAt: Date | undefined;
          
          if (timeElems.length >= 1) {
            const timeStr = timeElems[0].getAttribute('datetime') || 
                          timeElems[0].textContent || '';
            startedAt = this.parseDate(timeStr);
          }
          
          if (timeElems.length >= 2) {
            const timeStr = timeElems[1].getAttribute('datetime') || 
                          timeElems[1].textContent || '';
            finishedAt = this.parseDate(timeStr);
          }
          
          // Extract duration
          const durationElem = elem.querySelector('[data-testid="build-duration"]');
          const durationText = durationElem?.textContent || '';
          const duration = this.parseDuration(durationText);
          
          // Extract commit info
          const commitElem = elem.querySelector('[data-testid="commit-hash"]');
          const commit = commitElem?.textContent?.trim() || '';
          
          // Extract branch
          const branchElem = elem.querySelector('[data-testid="branch-name"]');
          const branch = branchElem?.textContent?.trim() || '';
          
          // Extract commit message
          const messageElem = elem.querySelector('[data-testid="commit-message"]');
          const message = messageElem?.textContent?.trim() || '';
          
          // Extract creator
          const creatorElem = elem.querySelector('[data-testid="build-creator"]');
          const createdBy = creatorElem?.textContent?.trim() || '';
          
          return {
            id: `${organization}-${slug}-${buildNumber}`,
            number: buildNumber,
            status,
            startedAt,
            finishedAt,
            duration,
            commit,
            branch,
            message,
            createdBy
          };
        } catch (error) {
          // Handle errors for individual build parsing
          errorService.logError(
            `Error parsing build data for ${organization}/${slug}`,
            ErrorSeverity.WARNING,
            ErrorCategory.PIPELINE,
            { error }
          );
          
          return {
            id: `${organization}-${slug}-${index}`,
            number: index,
            status: BuildStatus.UNKNOWN
          };
        }
      });
      
      // Calculate stats from builds
      const stats = this.calculateStats(builds);
      
      return { builds, stats };
    } catch (error) {
      errorService.captureException(error, {
        message: `Failed to fetch pipeline details for ${organization}/${slug}`,
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.PIPELINE
      });
      
      // Return empty results on error
      return { 
        builds: [],
        stats: {
          buildCount: 0,
          successRate: 0,
          avgDuration: 0,
          lastBuildStatus: BuildStatus.UNKNOWN,
          trend: "unknown",
          buildFrequency: 0
        }
      };
    }
  }

  /**
   * Get color for build status
   */
  public getStatusColor(status: BuildStatus): string {
    switch (status) {
      case BuildStatus.PASSED:
        return '#10B981'; // Green
      case BuildStatus.FAILED:
        return '#EF4444'; // Red
      case BuildStatus.RUNNING:
        return '#3B82F6'; // Blue
      case BuildStatus.SCHEDULED:
        return '#F59E0B'; // Amber
      case BuildStatus.CANCELED:
        return '#6B7280'; // Gray
      case BuildStatus.UNKNOWN:
      default:
        return '#9CA3AF'; // Light gray
    }
  }

  /**
   * Get icon name for build status
   */
  public getStatusIcon(status: BuildStatus): string {
    switch (status) {
      case BuildStatus.PASSED:
        return 'check-circle';
      case BuildStatus.FAILED:
        return 'x-circle';
      case BuildStatus.RUNNING:
        return 'loader';
      case BuildStatus.SCHEDULED:
        return 'clock';
      case BuildStatus.CANCELED:
        return 'slash';
      case BuildStatus.UNKNOWN:
      default:
        return 'help-circle';
    }
  }

  /**
   * Format duration in a human-readable way
   */
  public formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  /**
   * Get builds for a pipeline
   */
  public async getPipelineBuilds(
    pipeline: Pipeline | { organization: string; slug: string }
  ): Promise<BuildInfo[]> {
    const { organization, slug } = pipeline;
    const cacheKey = this.getPipelineCacheKey(organization, slug);
    
    // Check cache first
    const cachedData = this.pipelineCache.get(cacheKey);
    if (cachedData && !this.isCacheStale(cachedData)) {
      return cachedData.builds;
    }
    
    // Fetch new data if cache is missing or stale
    try {
      const { builds, stats } = await this.fetchPipelineDetails(organization, slug);
      
      // Update cache
      this.pipelineCache.set(cacheKey, {
        pipeline: pipeline as Pipeline,
        builds,
        stats,
        lastUpdated: Date.now()
      });
      
      return builds;
    } catch (error) {
      // If fetch fails but we have cached data, return it even if stale
      if (cachedData) {
        return cachedData.builds;
      }
      
      // Otherwise return empty array
      return [];
    }
  }

  /**
   * Get stats for a pipeline
   */
  public async getPipelineStats(
    pipeline: Pipeline | { organization: string; slug: string }
  ): Promise<PipelineStats> {
    const { organization, slug } = pipeline;
    const cacheKey = this.getPipelineCacheKey(organization, slug);
    
    // Check cache first
    const cachedData = this.pipelineCache.get(cacheKey);
    if (cachedData && !this.isCacheStale(cachedData)) {
      return cachedData.stats;
    }
    
    // Fetch new data if cache is missing or stale
    try {
      const { builds, stats } = await this.fetchPipelineDetails(organization, slug);
      
      // Update cache
      this.pipelineCache.set(cacheKey, {
        pipeline: pipeline as Pipeline,
        builds,
        stats,
        lastUpdated: Date.now()
      });
      
      return stats;
    } catch (error) {
      // If fetch fails but we have cached data, return it even if stale
      if (cachedData) {
        return cachedData.stats;
      }
      
      // Otherwise return default stats
      return {
        buildCount: 0,
        successRate: 0,
        avgDuration: 0,
        lastBuildStatus: BuildStatus.UNKNOWN,
        trend: "unknown",
        buildFrequency: 0
      };
    }
  }

  /**
   * Get most recent build for a pipeline
   */
  public async getLastBuild(
    pipeline: Pipeline | { organization: string; slug: string }
  ): Promise<BuildInfo | null> {
    const builds = await this.getPipelineBuilds(pipeline);
    
    if (builds.length === 0) {
      return null;
    }
    
    // Sort by build number (descending) and return the first
    return [...builds].sort((a, b) => b.number - a.number)[0];
  }

  /**
   * Force refresh pipeline data
   */
  public async refreshPipelineData(
    pipeline: Pipeline | { organization: string; slug: string }
  ): Promise<void> {
    const { organization, slug } = pipeline;
    
    try {
      const { builds, stats } = await this.fetchPipelineDetails(organization, slug);
      
      // Update cache
      this.pipelineCache.set(this.getPipelineCacheKey(organization, slug), {
        pipeline: pipeline as Pipeline,
        builds,
        stats,
        lastUpdated: Date.now()
      });
    } catch (error) {
      errorService.captureException(error, {
        message: `Failed to refresh pipeline data for ${organization}/${slug}`,
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.PIPELINE
      });
    }
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.pipelineCache.clear();
  }
}

// Export singleton instance
export const pipelineDetailsService = PipelineDetailsService.getInstance();
