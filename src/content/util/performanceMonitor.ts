import {
  errorService,
  ErrorCategory,
  ErrorSeverity,
} from "../services/errorService";

// In-memory performance metrics
const metrics: Record<
  string,
  {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    lastStartTime: number | null;
  }
> = {};

// Flag to enable/disable performance monitoring
let monitoringEnabled = false;

/**
 * Enable or disable performance monitoring
 * @param enabled Whether monitoring should be enabled
 */
export function enablePerformanceMonitoring(enabled: boolean): void {
  monitoringEnabled = enabled;

  if (enabled) {
    console.log("🔍 Performance monitoring enabled");
  } else {
    console.log("🔍 Performance monitoring disabled");
  }
}

/**
 * Start timing an operation
 * @param operation Name of the operation to time
 */
export function startTiming(operation: string): void {
  if (!monitoringEnabled) return;

  if (!metrics[operation]) {
    metrics[operation] = {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      lastStartTime: null,
    };
  }

  metrics[operation].lastStartTime = performance.now();
}

/**
 * End timing an operation and record metrics
 * @param operation Name of the operation to end timing for
 * @param logThreshold Optional threshold in ms to log slow operations
 */
export function endTiming(operation: string, logThreshold?: number): void {
  if (!monitoringEnabled) return;

  const metric = metrics[operation];
  if (!metric || metric.lastStartTime === null) {
    console.warn(`No active timing for operation: ${operation}`);
    return;
  }

  const endTime = performance.now();
  const duration = endTime - metric.lastStartTime;

  // Update metrics
  metric.count++;
  metric.totalTime += duration;
  metric.minTime = Math.min(metric.minTime, duration);
  metric.maxTime = Math.max(metric.maxTime, duration);
  metric.lastStartTime = null;

  // Log slow operations if threshold is provided
  if (logThreshold !== undefined && duration > logThreshold) {
    console.warn(
      `🐢 Slow operation: ${operation} took ${duration.toFixed(2)}ms (threshold: ${logThreshold}ms)`,
    );

    // Log to error service for persistent tracking of performance issues
    if (duration > logThreshold * 2) {
      errorService.logError(
        `Performance degradation detected: ${operation}`,
        ErrorSeverity.WARNING,
        ErrorCategory.PERFORMANCE,
        {
          operation,
          duration,
          threshold: logThreshold,
          avgTime: metric.totalTime / metric.count,
        },
      );
    }
  }
}

/**
 * Create a performance-monitored version of a function
 * @param fn Function to monitor
 * @param operationName Name to use for the operation
 * @param logThreshold Optional threshold in ms to log slow operations
 * @returns Monitored version of the function
 */
export function monitorFunction<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string,
  logThreshold?: number,
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    if (!monitoringEnabled) {
      return fn(...args);
    }

    startTiming(operationName);
    try {
      const result = fn(...args);

      // Handle promises specially to measure async operations accurately
      if (result instanceof Promise) {
        return result.finally(() => {
          endTiming(operationName, logThreshold);
        }) as ReturnType<T>;
      }

      endTiming(operationName, logThreshold);
      return result;
    } catch (error) {
      endTiming(operationName, logThreshold);
      throw error;
    }
  }) as T;
}

/**
 * Get current performance metrics
 * @returns Copy of the current metrics
 */
export function getPerformanceMetrics(): Record<
  string,
  {
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
  }
> {
  const result: Record<
    string,
    {
      count: number;
      avgTime: number;
      minTime: number;
      maxTime: number;
    }
  > = {};

  for (const [operation, metric] of Object.entries(metrics)) {
    if (metric.count > 0) {
      result[operation] = {
        count: metric.count,
        avgTime: metric.totalTime / metric.count,
        minTime: metric.minTime,
        maxTime: metric.maxTime,
      };
    }
  }

  return result;
}

/**
 * Log current performance metrics to console
 */
export function logPerformanceMetrics(): void {
  if (!monitoringEnabled) {
    console.log("Performance monitoring is disabled");
    return;
  }

  const metricsSummary = getPerformanceMetrics();

  if (Object.keys(metricsSummary).length === 0) {
    console.log("No performance metrics collected yet");
    return;
  }

  console.group("🔍 Performance Metrics:");

  // Sort operations by average time (descending)
  const sortedOperations = Object.entries(metricsSummary).sort(
    ([, a], [, b]) => b.avgTime - a.avgTime,
  );

  for (const [operation, metric] of sortedOperations) {
    console.log(
      `${operation}: ${metric.count} calls, avg: ${metric.avgTime.toFixed(2)}ms, ` +
        `min: ${metric.minTime.toFixed(2)}ms, max: ${metric.maxTime.toFixed(2)}ms`,
    );
  }

  console.groupEnd();
}

/**
 * Reset all performance metrics
 */
export function resetPerformanceMetrics(): void {
  for (const key of Object.keys(metrics)) {
    delete metrics[key];
  }
}

// Create an enum for common operations to avoid string typos
export enum PerformanceOperation {
  COMMAND_BOX_RENDER = "CommandBox.render",
  COMMAND_SEARCH = "CommandSearch",
  PIPELINE_SEARCH = "PipelineSearch",
  FUZZY_MATCH = "FuzzyMatch",
  COMMAND_EXECUTION = "CommandExecution",
  PIPELINE_DATA_FETCH = "PipelineDataFetch",
  UI_INTERACTION = "UIInteraction",
}

// By default, don't enable monitoring in production
// Use the browser console to enable it for debugging:
// enablePerformanceMonitoring(true)
