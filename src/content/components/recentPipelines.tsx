import React, { useState, useEffect } from "react";
import { userPreferencesService } from "../services/preferences";
import { Pipeline } from "../types";
import { PipelineItem } from "./pipelineItem";
import { cachedPipelines, fetchPipelines } from "../commands/pipeline";

interface RecentPipelinesSectionProps {
  selectedIndex: number;
  startIndex: number;
  onSelect: (pipeline: Pipeline) => void;
  onSelectionChange: (totalItems: number) => void;
}

export const RecentPipelinesSection: React.FC<RecentPipelinesSectionProps> = ({
  selectedIndex,
  startIndex,
  onSelect,
  onSelectionChange,
}) => {
  const [recentPipelines, setRecentPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentPipelines = async () => {
      try {
        setLoading(true);

        // Make sure we have pipelines data
        if (cachedPipelines.length === 0) {
          await fetchPipelines();
        }

        // Get recent pipeline IDs
        const recentPipelineData =
          await userPreferencesService.getRecentPipelines();

        // Map recent IDs to actual pipeline objects
        const recentItems: Pipeline[] = [];

        for (const recent of recentPipelineData) {
          const [org, slug] = recent.pipelineId.split("/");

          // Try to find in cached pipelines first
          let pipeline = cachedPipelines.find(
            (p) => p.organization === org && p.slug === slug,
          );

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

        setRecentPipelines(recentItems);

        // Inform parent of how many items we have - important for selection state
        onSelectionChange(recentItems.length);
      } catch (error) {
        console.error("Error loading recent pipelines:", error);
        // Make sure to notify parent even on error
        onSelectionChange(0);
      } finally {
        setLoading(false);
      }
    };

    loadRecentPipelines();
  }, [onSelectionChange]);

  if (loading) {
    return (
      <div className="cmd-k-results-section">
        <div className="cmd-k-section-title">Recent Pipelines</div>
        <div style={{ padding: "12px", textAlign: "center" }}>
          Loading recent pipelines...
        </div>
      </div>
    );
  }

  if (recentPipelines.length === 0) {
    return (
      <div className="cmd-k-results-section">
        <div className="cmd-k-section-title">Recent Pipelines</div>
        <div style={{ padding: "12px", textAlign: "center", color: "#666" }}>
          No recent pipelines found
        </div>
      </div>
    );
  }

  return (
    <div className="cmd-k-results-section">
      <div className="cmd-k-section-title" id="recents-section">
        Recent Pipelines
      </div>
      <div role="listbox" aria-labelledby="recents-section">
        {recentPipelines.map((pipeline, index) => (
          <PipelineItem
            key={`${pipeline.organization}/${pipeline.slug}`}
            pipeline={pipeline}
            isSelected={selectedIndex === startIndex + index}
            onClick={() => onSelect(pipeline)}
          />
        ))}
      </div>
    </div>
  );
};
