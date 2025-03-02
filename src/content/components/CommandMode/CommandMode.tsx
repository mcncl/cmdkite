import React, { useRef, useEffect } from "react";
import { Command, Pipeline, PipelineSuggestion } from "../../types";
import { CommandInput } from "../CommandInput";
import { PipelineResults } from "../PipelineResults";
import { useKeyboardNavigation } from "../../hooks";

interface CommandModeProps {
  command: Command;
  onBack: () => void;
  onExecute: (command: Command, input: string) => void;
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pipelineSuggestions: PipelineSuggestion[];
  resultsContainerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Command mode screen for executing a specific command
 */
export const CommandMode: React.FC<CommandModeProps> = ({
  command,
  onBack,
  onExecute,
  inputValue,
  onInputChange,
  pipelineSuggestions,
  resultsContainerRef,
}) => {
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Focus input when component mounts
  useEffect(() => {
    if (commandInputRef.current) {
      commandInputRef.current.focus();
    }
  }, [command]);

  // Handle pipeline selection
  const handlePipelineSelect = (pipeline: Pipeline) => {
    const pipelineString = `${pipeline.organization}/${pipeline.slug}`;
    onExecute(command, pipelineString);
  };

  // Setup keyboard navigation
  const keyboardNavigation = useKeyboardNavigation({
    sections: [
      {
        id: "suggestions",
        items: pipelineSuggestions.map((sugg) => sugg.pipeline),
        onItemSelect: handlePipelineSelect,
      },
    ],
    onEscape: onBack,
    onBackspace: (isEmpty: boolean) => {
      if (isEmpty) {
        onBack();
      }
    },
    containerRef: resultsContainerRef,
    inputRef: commandInputRef,
    shouldScrollToSelected: true,
  });

  return (
    <>
      <div className="cmd-k-command-header-bar">
        <div className="cmd-k-command-title">
          <span className="cmd-k-command-name">{command.name}</span>
          <button
            className="cmd-k-back-button"
            onClick={onBack}
            aria-label="Back to main menu"
          >
            ← Back
          </button>
        </div>
      </div>

      <CommandInput
        value={inputValue}
        onChange={onInputChange}
        onKeyDown={keyboardNavigation.handleKeyDown}
        placeholder={
          command.id === "pipeline"
            ? "Search pipelines..."
            : command.id === "new-build"
              ? "Search pipelines to create a build..."
              : "Enter parameters..."
        }
        inputRef={commandInputRef}
        className="cmd-k-input cmd-k-command-input"
      />

      {pipelineSuggestions.length > 0 && (
        <div ref={resultsContainerRef} className="cmd-k-results">
          <PipelineResults
            pipelines={pipelineSuggestions}
            selectedIndex={keyboardNavigation.selectedIndex}
            sectionStartIndex={0}
            onPipelineSelect={handlePipelineSelect}
            title="Pipelines"
            sectionId="command-pipelines-section"
          />
        </div>
      )}

      {inputValue && !pipelineSuggestions.length && (
        <div className="cmd-k-empty-state">No matching pipelines found</div>
      )}
    </>
  );
};
