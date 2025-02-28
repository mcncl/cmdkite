import React, { useRef, useEffect } from "react";
import {
  Command,
  Pipeline,
  CommandMatch,
  PipelineSuggestion,
} from "../../types";
import { CommandInput } from "../CommandInput";
import { CommandResults } from "../CommandResults";
import { PipelineResults } from "../PipelineResults";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";

interface MainModeProps {
  commandMatches: CommandMatch[];
  pipelineSuggestions: PipelineSuggestion[];
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCommandSelect: (command: Command) => void;
  onPipelineSelect: (pipeline: Pipeline) => void;
  onClose: () => void;
  resultsContainerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Main mode screen for searching commands and pipelines
 */
export const MainMode: React.FC<MainModeProps> = ({
  commandMatches,
  pipelineSuggestions,
  inputValue,
  onInputChange,
  onCommandSelect,
  onPipelineSelect,
  onClose,
  resultsContainerRef,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Setup keyboard navigation
  const keyboardNavigation = useKeyboardNavigation({
    sections: [
      {
        id: "commands",
        items: commandMatches.map((match) => match.command),
        onItemSelect: onCommandSelect,
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
        onClose();
      }
    },
    containerRef: resultsContainerRef,
    inputRef: inputRef,
    shouldScrollToSelected: true,
  });

  const commandSectionStartIndex = 0;
  const pipelineSectionStartIndex = commandMatches.length;

  // Calculate section indices for rendering
  const getSectionStartIndex = (sectionId: string): number => {
    if (sectionId === "commands") return commandSectionStartIndex;
    if (sectionId === "pipelines") return pipelineSectionStartIndex;
    return 0;
  };

  return (
    <>
      <CommandInput
        value={inputValue}
        onChange={onInputChange}
        onKeyDown={keyboardNavigation.handleKeyDown}
        inputRef={inputRef}
      />

      <div ref={resultsContainerRef} className="cmd-k-results">
        <CommandResults
          commands={commandMatches}
          selectedIndex={keyboardNavigation.selectedIndex}
          onCommandSelect={onCommandSelect}
          sectionStartIndex={getSectionStartIndex("commands")}
        />

        <PipelineResults
          pipelines={pipelineSuggestions}
          selectedIndex={keyboardNavigation.selectedIndex}
          sectionStartIndex={getSectionStartIndex("pipelines")}
          onPipelineSelect={onPipelineSelect}
        />

        {inputValue &&
          !commandMatches.length &&
          !pipelineSuggestions.length && (
            <div className="cmd-k-empty-state">No matching results found</div>
          )}
      </div>
    </>
  );
};
