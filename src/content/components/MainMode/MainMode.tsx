import React, { useRef, useEffect, useState, RefObject } from "react";
import {
  Command,
  Pipeline,
  CommandMatch,
  PipelineSuggestion,
} from "../../types";
import { CommandInput } from "../CommandInput";
import { CommandResults } from "../CommandResults";
import { PipelineResults } from "../PipelineResults";
import { RecentCommandsSection } from "../RecentCommandsSection";
import { FavoriteCommandsSection } from "../FavouriteCommandsSection";
import { useKeyboardNavigation } from "../../hooks";

export interface MainModeProps {
  // Input
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputChangeImmediate?: (value: string) => void;
  isSearching?: boolean;
  inputRef?: RefObject<HTMLInputElement>;

  // Data
  commandMatches: CommandMatch[];
  pipelineSuggestions: PipelineSuggestion[];

  // Selection
  selectedIndex: number;
  selectedSection: "commands" | "pipelines";
  onIndexChange: (index: number) => void;
  onSectionChange: (section: "commands" | "pipelines") => void;

  // Actions
  onCommandSelect: (command: Command) => void;
  onPipelineSelect: (pipeline: Pipeline) => void;
  onOpenAliasManager?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;

  // Additional properties
  resultsContainerRef?: RefObject<HTMLDivElement>;
  onClose?: () => void;
}

/**
 * Main mode screen for searching commands and pipelines
 */
export const MainMode: React.FC<MainModeProps> = ({
  input,
  onInputChange,
  onInputChangeImmediate,
  isSearching,
  commandMatches,
  pipelineSuggestions,
  selectedIndex,
  selectedSection,
  onIndexChange,
  onSectionChange,
  onCommandSelect,
  onPipelineSelect,
  onOpenAliasManager,
  onKeyDown,
  inputRef: externalInputRef,
  resultsContainerRef,
  onClose,
}) => {
  const localInputRef = useRef<HTMLInputElement>(null);

  // Use provided inputRef or fallback to local ref
  const inputRef = externalInputRef || localInputRef;

  // State for recent/favorite command sections
  const [recentCommandsCount, setRecentCommandsCount] = useState(0);
  const [favoriteCommandsCount, setFavoriteCommandsCount] = useState(0);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  // Determine whether to show recent/favorites based on input
  const showRecentsAndFavorites = !input.trim();

  // Setup keyboard navigation
  const keyboardNavigation = useKeyboardNavigation({
    sections: [
      ...(showRecentsAndFavorites
        ? [
            {
              id: "favoriteCommands",
              items: Array(favoriteCommandsCount).fill(null),
              // Fix: Change to use a function that only takes one parameter
              onItemSelect: (item) => {
                // Get the section to target
                const favoriteCommandContainer = document.querySelector(
                  "#favorite-commands-section",
                )?.parentElement;
                // Get all options in that section
                const commandElements =
                  favoriteCommandContainer?.querySelectorAll('[role="option"]');
                // Find the index of the item by counting through the array items
                const itemArray = Array(favoriteCommandsCount).fill(null);
                const index = itemArray.indexOf(item);
                // Click the element at that index
                if (
                  commandElements &&
                  index >= 0 &&
                  index < commandElements.length
                ) {
                  (commandElements[index] as HTMLElement)?.click();
                }
              },
            },
            {
              id: "recentCommands",
              items: Array(recentCommandsCount).fill(null),
              // Fix: Change to use a function that only takes one parameter
              onItemSelect: (item) => {
                // Get the section to target
                const recentCommandContainer = document.querySelector(
                  "#recent-commands-section",
                )?.parentElement;
                // Get all options in that section
                const commandElements =
                  recentCommandContainer?.querySelectorAll('[role="option"]');
                // Find the index of the item by counting through the array items
                const itemArray = Array(recentCommandsCount).fill(null);
                const index = itemArray.indexOf(item);
                // Click the element at that index
                if (
                  commandElements &&
                  index >= 0 &&
                  index < commandElements.length
                ) {
                  (commandElements[index] as HTMLElement)?.click();
                }
              },
            },
          ]
        : []),
      {
        id: "commands",
        items: commandMatches.map((match) => match.command),
        // Fix: Match the correct signature expected by KeyboardNavigationSection
        onItemSelect: (command) => {
          onCommandSelect(command);
        },
      },
      {
        id: "pipelines",
        items: pipelineSuggestions.map((sugg) => sugg.pipeline),
        onItemSelect: onPipelineSelect,
      },
    ],
    onEscape: onClose,
    onBackspace: (isEmpty: boolean) => {
      if (isEmpty) {
        onClose?.();
      }
    },
    containerRef: resultsContainerRef,
    inputRef: inputRef,
    shouldScrollToSelected: true,
    // Add custom key handler for alias manager
    customKeyHandlers: onOpenAliasManager
      ? {
          F2: () => {
            onOpenAliasManager();
            return true;
          },
        }
      : undefined,
  });

  // Calculate section indices for rendering
  const getSectionStartIndex = (sectionId: string): number => {
    if (showRecentsAndFavorites) {
      if (sectionId === "favoriteCommands") return 0;
      if (sectionId === "recentCommands") return favoriteCommandsCount;
      if (sectionId === "commands")
        return favoriteCommandsCount + recentCommandsCount;
      if (sectionId === "pipelines")
        return (
          favoriteCommandsCount + recentCommandsCount + commandMatches.length
        );
    } else {
      if (sectionId === "commands") return 0;
      if (sectionId === "pipelines") return commandMatches.length;
    }
    return 0;
  };

  // Handle favorite commands count change
  const handleFavoriteCommandsCountChange = (count: number) => {
    setFavoriteCommandsCount(count);
  };

  // Handle recent commands count change
  const handleRecentCommandsCountChange = (count: number) => {
    setRecentCommandsCount(count);
  };

  return (
    <>
      <CommandInput
        value={input}
        onChange={onInputChange}
        onKeyDown={onKeyDown || keyboardNavigation.handleKeyDown}
        inputRef={inputRef}
      />

      <div ref={resultsContainerRef} className="cmd-k-results">
        {/* Show these sections only when there's no input */}
        {showRecentsAndFavorites && (
          <>
            <FavoriteCommandsSection
              selectedIndex={selectedIndex}
              startIndex={getSectionStartIndex("favoriteCommands")}
              onCommandSelect={onCommandSelect}
              onSelectionChange={handleFavoriteCommandsCountChange}
            />

            <RecentCommandsSection
              selectedIndex={selectedIndex}
              startIndex={getSectionStartIndex("recentCommands")}
              onCommandSelect={onCommandSelect}
              onSelectionChange={handleRecentCommandsCountChange}
            />

            {onOpenAliasManager && (
              <div className="cmd-k-alias-manager-tip">
                Press <kbd>F2</kbd> to manage command aliases
              </div>
            )}
          </>
        )}

        <CommandResults
          commands={commandMatches}
          selectedIndex={selectedIndex}
          onCommandSelect={onCommandSelect}
          sectionStartIndex={getSectionStartIndex("commands")}
        />

        <PipelineResults
          pipelines={pipelineSuggestions}
          selectedIndex={selectedIndex}
          sectionStartIndex={getSectionStartIndex("pipelines")}
          onPipelineSelect={onPipelineSelect}
        />

        {input && !commandMatches.length && !pipelineSuggestions.length && (
          <div className="cmd-k-empty-state">No matching results found</div>
        )}
      </div>
    </>
  );
};
