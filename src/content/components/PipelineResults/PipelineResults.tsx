import React from "react";
import { Pipeline, PipelineSuggestion } from "../../types";

interface PipelineResultsProps {
  pipelines: PipelineSuggestion[];
  selectedIndex: number;
  sectionStartIndex: number;
  onPipelineSelect: (pipeline: Pipeline) => void;
  title?: string;
  sectionId?: string;
}

/**
 * Renders a list of pipeline search results
 */
export const PipelineResults: React.FC<PipelineResultsProps> = ({
  pipelines,
  selectedIndex,
  sectionStartIndex = 0,
  onPipelineSelect,
  title = "Pipelines",
  sectionId = "pipelines-section",
}) => {
  if (pipelines.length === 0) {
    return null;
  }

  return (
    <div className="cmd-k-results-section">
      <div className="cmd-k-section-title" id={sectionId}>
        {title}
      </div>
      <div role="listbox" aria-labelledby={sectionId}>
        {pipelines.map(({ pipeline }, index) => {
          const isSelected = sectionStartIndex + index === selectedIndex;
          return (
            <div
              key={`${pipeline.organization}/${pipeline.slug}`}
              className={`cmd-k-result ${isSelected ? "selected" : ""}`}
              onClick={() => onPipelineSelect(pipeline)}
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
            >
              <div className="cmd-k-pipeline">
                <div className="cmd-k-pipeline-info">
                  <div className="cmd-k-pipeline-name">
                    {pipeline.emoji && (
                      <span style={{ marginRight: "8px" }}>
                        {pipeline.emoji}
                      </span>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
