import React, { useRef, useEffect, useState, RefObject } from "react";
import { Command, Pipeline, PipelineSuggestion } from "../../types";
import { CommandInput } from "../CommandInput";
import { PipelineResults } from "../PipelineResults";
import { useKeyboardNavigation } from "../../hooks";

export interface CommandModeProps {
  command: Command;
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSearching?: boolean;
  pipelineSuggestions: PipelineSuggestion[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  onPipelineSelect: (pipeline: Pipeline) => void;
  onExecute: (input: string) => void;
  onBack: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  inputRef?: RefObject<HTMLInputElement>;
  resultsContainerRef?: RefObject<HTMLDivElement>;
}

/**
 * Command mode screen for executing a specific command
 */
export const CommandMode: React.FC<CommandModeProps> = ({
  command,
  input,
  onInputChange,
  isSearching,
  pipelineSuggestions,
  selectedIndex,
  onIndexChange,
  onPipelineSelect,
  onExecute,
  onBack,
  onKeyDown,
  inputRef: externalInputRef,
  resultsContainerRef,
}) => {
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Use provided inputRef or fallback to local ref
  const inputRef = externalInputRef || commandInputRef;

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [command, inputRef]);

  // Handle pipeline selection
  const handlePipelineSelect = (pipeline: Pipeline) => {
    onPipelineSelect(pipeline);
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
    inputRef: inputRef,
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
        value={input}
        onChange={onInputChange}
        onKeyDown={onKeyDown || keyboardNavigation.handleKeyDown}
        placeholder={
          command.id === "pipeline"
            ? "Search pipelines..."
            : command.id === "new-build"
              ? "Search pipelines to create a build..."
              : "Enter parameters..."
        }
        inputRef={inputRef}
        className="cmd-k-input cmd-k-command-input"
      />

      {pipelineSuggestions.length > 0 && (
        <div ref={resultsContainerRef} className="cmd-k-results">
          <PipelineResults
            pipelines={pipelineSuggestions}
            selectedIndex={selectedIndex}
            sectionStartIndex={0}
            onPipelineSelect={handlePipelineSelect}
            title="Pipelines"
            sectionId="command-pipelines-section"
          />
        </div>
      )}

      {input && !pipelineSuggestions.length && (
        <div className="cmd-k-empty-state">No matching pipelines found</div>
      )}
    </>
  );
};
