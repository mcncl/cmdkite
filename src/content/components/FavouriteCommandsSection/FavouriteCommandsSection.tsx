import React, { useState, useEffect } from "react";
import { Command } from "../../types";
import { userPreferencesService } from "../../services/preferences";
import { commandRegistry } from "../../services/commandRegistry";
import { useErrorHandler } from "../../hooks";

interface FavoriteCommandsSectionProps {
  selectedIndex: number;
  startIndex: number;
  onCommandSelect: (command: Command) => void;
  onSelectionChange: (totalItems: number) => void;
}

/**
 * Component to display favorite commands
 */
export const FavoriteCommandsSection: React.FC<
  FavoriteCommandsSectionProps
> = ({ selectedIndex, startIndex, onCommandSelect, onSelectionChange }) => {
  const [favoriteCommands, setFavoriteCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleError } = useErrorHandler();

  useEffect(() => {
    const loadFavoriteCommands = async () => {
      try {
        setLoading(true);

        // Get favorite command IDs
        const favoriteCommandIds =
          await userPreferencesService.getFavoriteCommands();

        // Map to actual command objects
        const commandItems: Command[] = [];

        for (const commandId of favoriteCommandIds) {
          const command = commandRegistry.getCommand(commandId);

          // Only include commands that are available and exist
          if (command && (!command.isAvailable || command.isAvailable())) {
            commandItems.push(command);
          }
        }

        setFavoriteCommands(commandItems);

        // Inform parent of how many items we have
        onSelectionChange(commandItems.length);
      } catch (error) {
        handleError(error, "Failed to load favorite commands");
        onSelectionChange(0);
      } finally {
        setLoading(false);
      }
    };

    loadFavoriteCommands();
  }, [onSelectionChange, handleError]);

  // Toggle command as favorite
  const toggleFavorite = async (event: React.MouseEvent, commandId: string) => {
    event.stopPropagation(); // Prevent selecting the command

    try {
      const newStatus =
        await userPreferencesService.toggleFavoriteCommand(commandId);

      if (!newStatus) {
        // If it's no longer a favorite, remove it from the list
        setFavoriteCommands((prevCommands) => {
          const newCommands = prevCommands.filter(
            (cmd) => cmd.id !== commandId,
          );
          onSelectionChange(newCommands.length); // Update parent with new count
          return newCommands;
        });
      }
    } catch (error) {
      handleError(error, "Failed to toggle favorite status");
    }
  };

  if (loading) {
    return (
      <div className="cmd-k-results-section">
        <div className="cmd-k-section-title">Favorite Commands</div>
        <div style={{ padding: "12px", textAlign: "center" }}>
          Loading favorite commands...
        </div>
      </div>
    );
  }

  if (favoriteCommands.length === 0) {
    return null; // Don't show the section if there are no favorite commands
  }

  return (
    <div className="cmd-k-results-section">
      <div className="cmd-k-section-title" id="favorite-commands-section">
        Favorite Commands
      </div>
      <div role="listbox" aria-labelledby="favorite-commands-section">
        {favoriteCommands.map((command, index) => {
          const isSelected = startIndex + index === selectedIndex;

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
                <div className="cmd-k-command-name">{command.name}</div>
                <div className="cmd-k-command-actions">
                  <div className="cmd-k-command-id">/{command.id}</div>
                  <div
                    className="cmd-k-favorite"
                    onClick={(e) => toggleFavorite(e, command.id)}
                    title="Remove from favorites"
                    aria-label="Remove from favorites"
                    role="button"
                  >
                    <svg
                      className="cmd-k-favorite-icon active"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="#FFD700"
                      stroke="#FFD700"
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
