import React, { useState, useEffect } from "react";
import { userPreferencesService } from "../services/preferences";
import { pipelineService } from "../services/pipelineService";
import { Pipeline } from "../types";
import { PipelineItem } from "./PipelineItem";

interface FavoritePipelinesSectionProps {
  selectedIndex: number;
  startIndex: number;
  onSelect: (pipeline: Pipeline) => void;
  onSelectionChange: (totalItems: number) => void;
}

export const FavoritePipelinesSection: React.FC<
  FavoritePipelinesSectionProps
> = ({ selectedIndex, startIndex, onSelect, onSelectionChange }) => {
  const [favoritePipelines, setFavoritePipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavoritePipelines = async () => {
      try {
        setLoading(true);

        // Make sure we have pipelines data
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

        setFavoritePipelines(favoriteItems);
        // Inform parent of how many items we have
        onSelectionChange(favoriteItems.length);
      } catch (error) {
        console.error("Error loading favorite pipelines:", error);
        onSelectionChange(0);
      } finally {
        setLoading(false);
      }
    };

    loadFavoritePipelines();
  }, [onSelectionChange]);

  if (loading) {
    return (
      <div className="cmd-k-results-section">
        <div className="cmd-k-section-title">Favorite Pipelines</div>
        <div style={{ padding: "12px", textAlign: "center" }}>
          Loading favorite pipelines...
        </div>
      </div>
    );
  }

  if (favoritePipelines.length === 0) {
    return (
      <div className="cmd-k-results-section">
        <div className="cmd-k-section-title">Favorite Pipelines</div>
        <div style={{ padding: "12px", textAlign: "center", color: "#666" }}>
          No favorite pipelines yet. Click the star icon to add favorites.
        </div>
      </div>
    );
  }

  return (
    <div className="cmd-k-results-section">
      <div className="cmd-k-section-title" id="favorites-section">
        Favorite Pipelines
      </div>
      <div role="listbox" aria-labelledby="favorites-section">
        {favoritePipelines.map((pipeline, index) => (
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
