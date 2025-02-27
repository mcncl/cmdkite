/**
 * This file provides backwards compatibility with code that imports
 * from the old pipeline module directly. It redirects those imports
 * to use the new PipelineService.
 */

import { Pipeline } from "../../types";
import { pipelineService } from "../../services/pipelineService";
import { fuzzyMatch } from "../../util/search";

// Create a proxy to make cachedPipelines behave like an array of Pipeline objects
class PipelineArrayProxy extends Array<Pipeline> {
  constructor() {
    super();
    return new Proxy(this, {
      get(target, prop) {
        // Special case for the 'length' property
        if (prop === "length") {
          return pipelineService.pipelines.length;
        }

        // Handle array methods
        if (
          typeof prop === "string" &&
          ["map", "filter", "find", "forEach", "slice", "includes"].includes(
            prop,
          )
        ) {
          return function (...args: any[]) {
            // @ts-ignore
            return pipelineService.pipelines[prop](...args);
          };
        }

        // Handle numeric indices
        if (typeof prop === "string" && !isNaN(Number(prop))) {
          const index = Number(prop);
          return pipelineService.pipelines[index];
        }

        // Default behavior
        // @ts-ignore
        return target[prop];
      },
    });
  }
}

// Export cachedPipelines as a proxy to pipelineService.pipelines
export const cachedPipelines = new PipelineArrayProxy();

/**
 * Fetch pipelines using the pipeline service
 * @returns Promise resolving to pipelines array
 */
export async function fetchPipelines() {
  return pipelineService.fetchPipelines();
}

// Export the fuzzy matching function for backward compatibility
export { fuzzyMatch };
