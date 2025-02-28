import React from "react";
import { Command, CommandMatch } from "../../types";

interface CommandResultsProps {
  commands: CommandMatch[];
  selectedIndex: number;
  onCommandSelect: (command: Command) => void;
  sectionStartIndex: number;
}

/**
 * Renders a list of command search results
 */
export const CommandResults: React.FC<CommandResultsProps> = ({
  commands,
  selectedIndex,
  onCommandSelect,
  sectionStartIndex = 0,
}) => {
  if (commands.length === 0) {
    return null;
  }

  return (
    <div className="cmd-k-results-section">
      <div className="cmd-k-section-title" id="commands-section">
        Commands
      </div>
      <div role="listbox" aria-labelledby="commands-section">
        {commands.map(({ command }, index) => {
          const isSelected = sectionStartIndex + index === selectedIndex;
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
                <div className="cmd-k-command-id">/{command.id}</div>
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
