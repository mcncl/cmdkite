import React, { useState, useEffect } from "react";
import { Pipeline } from "../../types";
import { userPreferencesService } from "../../services/preferences";

interface PipelineItemProps {
  pipeline: Pipeline;
  isSelected: boolean;
  onClick: () => void;
}

export const PipelineItem: React.FC<PipelineItemProps> = ({
  pipeline,
  isSelected,
  onClick,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if this pipeline is favorited on component mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favoriteStatus = await userPreferencesService.isFavoritePipeline(
        pipeline.organization,
        pipeline.slug,
      );
      setIsFavorite(favoriteStatus);
    };

    checkFavoriteStatus();
  }, [pipeline.organization, pipeline.slug]);

  // Handle favorite toggle
  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the item click

    const newStatus = await userPreferencesService.toggleFavoritePipeline(
      pipeline.organization,
      pipeline.slug,
    );

    setIsFavorite(newStatus);
  };

  return (
    <div
      className={`cmd-k-result ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      role="option"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
    >
      <div className="cmd-k-pipeline">
        <div className="cmd-k-pipeline-info">
          <div className="cmd-k-pipeline-name">
            {pipeline.emoji && (
              <span style={{ marginRight: "8px" }}>{pipeline.emoji}</span>
            )}
            {pipeline.name}
          </div>
          {pipeline.description && (
            <div className="cmd-k-pipeline-description">
              {pipeline.description}
            </div>
          )}
          <div className="cmd-k-pipeline-org">
            {pipeline.organization}/{pipeline.slug}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Favorite star button */}
          <div
            className="cmd-k-favorite"
            onClick={handleFavoriteToggle}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            role="button"
          >
            <svg
              className={`cmd-k-favorite-icon ${isFavorite ? "active" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={isFavorite ? "#FFD700" : "none"}
              stroke={isFavorite ? "#FFD700" : "currentColor"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>

          {/* Pipeline metrics if available */}
          {pipeline.speed && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", color: "#666" }}>Speed</div>
              <div style={{ fontWeight: 500 }}>{pipeline.speed}</div>
            </div>
          )}
          {pipeline.reliability && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", color: "#666" }}>Reliability</div>
              <div style={{ fontWeight: 500 }}>{pipeline.reliability}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
