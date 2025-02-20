import React from "react";

interface CommandBoxKeyboardProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  suggestions: Array<{ pipeline: any; score: number }>;
  commandMatches: Array<{ command: any; score: number }>;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  onExecuteCommand: (command: any, input?: string) => void;
  onSelectPipeline: (pipeline: any) => void;
  onClose?: () => void;
  // New optional props
  getTotalItems?: () => Array<{ type: string; index: number }>;
  onItemSelect?: (index: number) => void;
}

interface KeyboardHandlerResult {
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Keyboard handler hook for CommandBox component
 */
export function useCommandBoxKeyboard({
  input,
  setInput,
  suggestions,
  commandMatches,
  selectedIndex,
  setSelectedIndex,
  onExecuteCommand,
  onSelectPipeline,
  onClose,
  getTotalItems,
  onItemSelect,
}: CommandBoxKeyboardProps): KeyboardHandlerResult {
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      // Use the new getTotalItems function if provided, otherwise calculate from suggestions and commands
      const allItems = getTotalItems ? getTotalItems() : [];
      const totalItems = getTotalItems
        ? allItems.length
        : commandMatches.length + suggestions.length;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose?.();
          break;

        case "ArrowDown":
          e.preventDefault();
          if (totalItems === 0) return;
          if (selectedIndex === -1) {
            setSelectedIndex(0);
          } else {
            setSelectedIndex(
              selectedIndex >= totalItems - 1 ? 0 : selectedIndex + 1,
            );
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (totalItems === 0) return;
          if (selectedIndex === -1) {
            setSelectedIndex(totalItems - 1);
          } else {
            setSelectedIndex(
              selectedIndex <= 0 ? totalItems - 1 : selectedIndex - 1,
            );
          }
          break;

        case "Tab":
          e.preventDefault();
          if (totalItems === 0) return;

          if (e.shiftKey) {
            // Shift+Tab - move up
            if (selectedIndex === -1) {
              setSelectedIndex(totalItems - 1);
            } else {
              setSelectedIndex(
                selectedIndex <= 0 ? totalItems - 1 : selectedIndex - 1,
              );
            }
          } else {
            // Tab - move down
            if (selectedIndex === -1) {
              setSelectedIndex(0);
            } else {
              setSelectedIndex(
                selectedIndex >= totalItems - 1 ? 0 : selectedIndex + 1,
              );
            }
          }
          break;

        case "Enter":
          e.preventDefault();

          if (selectedIndex < 0 || totalItems === 0) {
            return;
          }

          if (onItemSelect) {
            // Use the new handler if provided
            onItemSelect(selectedIndex);
          } else {
            // Fall back to the original behavior
            if (selectedIndex < commandMatches.length) {
              const command = commandMatches[selectedIndex].command;
              const inputParts = input.split(" ");
              const commandInput =
                inputParts.length > 1
                  ? inputParts.slice(1).join(" ")
                  : undefined;
              onExecuteCommand(command, commandInput);
            } else {
              const pipelineIndex = selectedIndex - commandMatches.length;
              if (pipelineIndex >= 0 && pipelineIndex < suggestions.length) {
                onSelectPipeline(suggestions[pipelineIndex].pipeline);
              }
            }
          }
          break;

        case "Home":
          e.preventDefault();
          if (totalItems > 0) {
            setSelectedIndex(0);
          }
          break;

        case "End":
          e.preventDefault();
          if (totalItems > 0) {
            setSelectedIndex(totalItems - 1);
          }
          break;

        case "Backspace":
          // If input is empty and backspace is pressed, close
          if (input === "") {
            e.preventDefault();
            onClose?.();
          }
          break;

        // Keyboard shortcuts for fast navigation within results
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          // Only handle digit shortcuts if Alt key is pressed
          if (e.altKey) {
            e.preventDefault();
            const digitIndex = parseInt(e.key, 10) - 1;
            if (digitIndex < totalItems) {
              // Set the selected index first
              setSelectedIndex(digitIndex);

              // Auto-execute the selected item
              if (onItemSelect) {
                onItemSelect(digitIndex);
              } else {
                // Fall back to original behavior
                if (digitIndex < commandMatches.length) {
                  const command = commandMatches[digitIndex].command;
                  const inputParts = input.split(" ");
                  const commandInput =
                    inputParts.length > 1
                      ? inputParts.slice(1).join(" ")
                      : undefined;
                  onExecuteCommand(command, commandInput);
                } else {
                  const pipelineIndex = digitIndex - commandMatches.length;
                  if (
                    pipelineIndex >= 0 &&
                    pipelineIndex < suggestions.length
                  ) {
                    onSelectPipeline(suggestions[pipelineIndex].pipeline);
                  }
                }
              }
            }
          }
          break;

        // Quick clear with Escape+Escape or Ctrl+Backspace
        case "Delete":
          if (e.ctrlKey) {
            e.preventDefault();
            setInput("");
          }
          break;
      }
    },
    [
      input,
      setInput,
      commandMatches,
      suggestions,
      selectedIndex,
      setSelectedIndex,
      onExecuteCommand,
      onSelectPipeline,
      onClose,
      getTotalItems,
      onItemSelect,
    ],
  );

  return { handleKeyDown };
}
