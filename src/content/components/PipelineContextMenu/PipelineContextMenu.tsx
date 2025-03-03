import React, { useState, useEffect, useRef } from "react";
import { Pipeline } from "../../types";
import {
  pipelineDetailsService,
  BuildStatus,
  BuildInfo,
} from "../../services/pipelineDetailsService";
import { BuildHistoryWidget } from "../BuildHistoryWidget";
import { useErrorHandler } from "../../hooks";

interface PipelineContextMenuProps {
  pipeline: Pipeline;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

/**
 * Context menu component for pipeline quick actions
 */
export const PipelineContextMenu: React.FC<PipelineContextMenuProps> = ({
  pipeline,
  isOpen,
  onClose,
  position,
}) => {
  const [recentBuilds, setRecentBuilds] = useState<BuildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const { handleError } = useErrorHandler();

  // Fetch recent builds when menu opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchRecentBuilds = async () => {
      try {
        setLoading(true);
        const builds = await pipelineDetailsService.getPipelineBuilds(pipeline);

        // Sort by build number (most recent first) and take top 5
        const sortedBuilds = [...builds]
          .sort((a, b) => b.number - a.number)
          .slice(0, 5);

        setRecentBuilds(sortedBuilds);
      } catch (error) {
        handleError(error, "Failed to load recent builds");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentBuilds();
  }, [isOpen, pipeline, handleError]);

  // Handle click outside to close menu
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard escape to close menu
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Helper functions
  const handleViewPipeline = () => {
    window.location.href = `https://buildkite.com/${pipeline.organization}/${pipeline.slug}`;
    onClose();
  };

  const handleNewBuild = () => {
    window.location.href = `https://buildkite.com/organizations/${pipeline.organization}/pipelines/${pipeline.slug}/builds/new`;
    onClose();
  };

  const handleViewBuild = (build: BuildInfo) => {
    window.location.href = `https://buildkite.com/${pipeline.organization}/${pipeline.slug}/builds/${build.number}`;
    onClose();
  };

  const handleViewSettings = () => {
    window.location.href = `https://buildkite.com/organizations/${pipeline.organization}/pipelines/${pipeline.slug}/settings`;
    onClose();
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await pipelineDetailsService.refreshPipelineData(pipeline);
      const builds = await pipelineDetailsService.getPipelineBuilds(pipeline);

      const sortedBuilds = [...builds]
        .sort((a, b) => b.number - a.number)
        .slice(0, 5);

      setRecentBuilds(sortedBuilds);
    } catch (error) {
      handleError(error, "Failed to refresh pipeline data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={menuRef}
      className="cmd-k-pipeline-context-menu"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      <div className="cmd-k-pipeline-context-header">
        <div className="cmd-k-pipeline-context-title">
          {pipeline.emoji && (
            <span className="cmd-k-pipeline-emoji">{pipeline.emoji}</span>
          )}
          <span>{pipeline.name}</span>
        </div>
        <button
          className="cmd-k-context-menu-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          &times;
        </button>
      </div>

      <div className="cmd-k-pipeline-context-content">
        {/* Build history visualization */}
        <div className="cmd-k-context-section">
          <h4 className="cmd-k-context-section-title">Build History</h4>
          <BuildHistoryWidget pipeline={pipeline} maxBuilds={10} />
        </div>

        {/* Recent builds list */}
        <div className="cmd-k-context-section">
          <h4 className="cmd-k-context-section-title">Recent Builds</h4>
          {loading ? (
            <div className="cmd-k-context-loading">Loading...</div>
          ) : recentBuilds.length === 0 ? (
            <div className="cmd-k-context-empty">No recent builds</div>
          ) : (
            <div className="cmd-k-recent-builds-list">
              {recentBuilds.map((build) => {
                const statusColor = pipelineDetailsService.getStatusColor(
                  build.status,
                );
                return (
                  <div
                    key={build.id}
                    className="cmd-k-recent-build-item"
                    onClick={() => handleViewBuild(build)}
                    tabIndex={0}
                    role="button"
                  >
                    <div
                      className={`cmd-k-recent-build-status cmd-k-build-status-${build.status}`}
                      style={{ backgroundColor: statusColor }}
                    />
                    <div className="cmd-k-recent-build-number">
                      #{build.number}
                    </div>
                    <div className="cmd-k-recent-build-branch">
                      {build.branch || "main"}
                    </div>
                    {build.duration && (
                      <div className="cmd-k-recent-build-duration">
                        {pipelineDetailsService.formatDuration(build.duration)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="cmd-k-context-section">
          <h4 className="cmd-k-context-section-title">Actions</h4>
          <div className="cmd-k-action-buttons">
            <button
              className="cmd-k-action-button"
              onClick={handleViewPipeline}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              View Pipeline
            </button>
            <button className="cmd-k-action-button" onClick={handleNewBuild}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Create Build
            </button>
            <button
              className="cmd-k-action-button"
              onClick={handleViewSettings}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Settings
            </button>
            <button
              className="cmd-k-action-button"
              onClick={handleRefresh}
              disabled={loading}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={loading ? "cmd-k-spinning" : ""}
              >
                <path d="M21.5 2v6h-6"></path>
                <path d="M2.5 12a10 10 0 0 1 15-8l4 4"></path>
                <path d="M2.5 22v-6h6"></path>
                <path d="M21.5 12a10 10 0 0 1-15 8l-4-4"></path>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
