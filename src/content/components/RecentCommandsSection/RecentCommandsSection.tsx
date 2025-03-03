import React, { useState, useEffect } from "react";
import { Command } from "../../types";
import {
  userPreferencesService,
  RecentCommand,
} from "../../services/preferences";
import { commandRegistry } from "../../services/commandRegistry";
import { useErrorHandler } from "../../hooks";

interface RecentCommandsSectionProps {
  selectedIndex: number;
  startIndex: number;
  onCommandSelect: (command: Command) => void;
  onSelectionChange: (totalItems: number) => void;
}

/**
 * Component to display recently used commands
 */
export const RecentCommandsSection: React.FC<RecentCommandsSectionProps> = ({
  selectedIndex,
  startIndex,
  onCommandSelect,
  onSelectionChange,
}) => {
  const [recentCommands, setRecentCommands] = useState<
    Array<{ command: Command; useCount: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const { handleError } = useErrorHandler();

  useEffect(() => {
    const loadRecentCommands = async () => {
      try {
        setLoading(true);

        // Get recent command history
        const recentCommandData =
          await userPreferencesService.getRecentCommands();

        // Map to actual command objects
        const commandItems: Array<{ command: Command; useCount: number }> = [];

        for (const recent of recentCommandData) {
          const command = commandRegistry.getCommand(recent.commandId);

          // Only include commands that are available and exist
          if (command && (!command.isAvailable || command.isAvailable())) {
            commandItems.push({
              command,
              useCount: recent.useCount,
            });
          }
        }

        setRecentCommands(commandItems);

        // Inform parent of how many items we have
        onSelectionChange(commandItems.length);
      } catch (error) {
        handleError(error, "Failed to load recent commands");
        onSelectionChange(0);
      } finally {
        setLoading(false);
      }
    };

    loadRecentCommands();
  }, [onSelectionChange, handleError]);

  // Toggle command as favorite
  const toggleFavorite = async (event: React.MouseEvent, commandId: string) => {
    event.stopPropagation(); // Prevent selecting the command

    try {
      await userPreferencesService.toggleFavoriteCommand(commandId);

      // Force re-render to show updated state
      setRecentCommands((prevCommands) => [...prevCommands]);
    } catch (error) {
      handleError(error, "Failed to toggle favorite status");
    }
  };

  // Check if a command is favorite (for star icon)
  const isCommandFavorite = async (commandId: string): Promise<boolean> => {
    try {
      return await userPreferencesService.isFavoriteCommand(commandId);
    } catch (error) {
      handleError(error, "Failed to check favorite status");
      return false;
    }
  };

  if (loading) {
    return (
      <div className="cmd-k-results-section">
        <div className="cmd-k-section-title">Recent Commands</div>
        <div style={{ padding: "12px", textAlign: "center" }}>
          Loading recent commands...
        </div>
      </div>
    );
  }

  if (recentCommands.length === 0) {
    return null; // Don't show the section if there are no recent commands
  }

  return (
    <div className="cmd-k-results-section">
      <div className="cmd-k-section-title" id="recent-commands-section">
        Recent Commands
      </div>
      <div role="listbox" aria-labelledby="recent-commands-section">
        {recentCommands.map(({ command, useCount }, index) => {
          const isSelected = startIndex + index === selectedIndex;

          // Use React state to track favorite status
          const [isFavorite, setIsFavorite] = useState(false);

          // Check favorite status when component mounts
          useEffect(() => {
            isCommandFavorite(command.id).then(setIsFavorite);
          }, [command.id]);

          return (
            <div
              key={command.id}
              className={`cmd-k-command ${isSelected ? "selected" : ""}`}
              onClick={() => onCommandSelect(command)}
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
            >
              <div className="cmd-k-command-header">
                <div className="cmd-k-command-name">
                  {command.name}
                  <span className="cmd-k-command-use-count">
                    {useCount > 1 ? ` (${useCount}×)` : ""}
                  </span>
                </div>
                <div className="cmd-k-command-actions">
                  <div className="cmd-k-command-id">/{command.id}</div>
                  <div
                    className="cmd-k-favorite"
                    onClick={(e) => {
                      toggleFavorite(e, command.id);
                      setIsFavorite(!isFavorite);
                    }}
                    title={
                      isFavorite ? "Remove from favorites" : "Add to favorites"
                    }
                    aria-label={
                      isFavorite ? "Remove from favorites" : "Add to favorites"
                    }
                    role="button"
                  >
                    <svg
                      className={`cmd-k-favorite-icon ${isFavorite ? "active" : ""}`}
                      width="14"
                      height="14"
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
                </div>
              </div>
              <div className="cmd-k-command-description">
                {command.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
