// src/content/components/CommandBox/CommandBox.tsx
import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { SearchService } from "../../services/SearchService/searchService";
import { userPreferencesService } from "../../services/preferences";
import { ThemeToggle } from "../ThemeToggle";
import type {
  Command,
  Pipeline,
  CommandMatch,
  PipelineSuggestion,
  CommandBoxProps,
} from "../../types";
import { MainMode } from "../MainMode";
import { CommandMode } from "../CommandMode";
import { CommandAliasManager } from "../CommandAliasManager";
import { useErrorHandler } from "../../hooks";
import { ErrorBoundary } from "../ErrorBoundary";

// Define view modes
type ViewMode = "main" | "command" | "alias-manager";

// Get the singleton instance of SearchService
import { searchService } from "../../services/SearchService/searchService";

/**
 * CommandBox - Command palette component for quick navigation
 */
export const CommandBox: React.FC<CommandBoxProps> = memo(
  ({ onClose, isVisible = false }) => {
    // State management
    const [input, setInput] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("main");
    const [activeCommand, setActiveCommand] = useState<Command | null>(null);
    const [commandSubInput, setCommandSubInput] = useState("");
    const [pipelineSuggestions, setPipelineSuggestions] = useState<
      PipelineSuggestion[]
    >([]);
    const [commandMatches, setCommandMatches] = useState<CommandMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedSection, setSelectedSection] = useState<
      "commands" | "pipelines"
    >("commands");

    // Error handling
    const { handleError } = useErrorHandler();

    // Refs
    const boxRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const subInputRef = useRef<HTMLInputElement>(null);
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Reset state when closing
    useEffect(() => {
      if (!isVisible) {
        setInput("");
        setPipelineSuggestions([]);
        setCommandMatches([]);
        setViewMode("main");
        setActiveCommand(null);
        setCommandSubInput("");
        setIsSearching(false);
        setSelectedIndex(0);
      } else {
        // Focus input when opening
        setTimeout(() => {
          if (viewMode === "main" && inputRef.current) {
            inputRef.current.focus();
          } else if (viewMode === "command" && subInputRef.current) {
            subInputRef.current.focus();
          }
        }, 50);
      }
    }, [isVisible, viewMode]);

    // Execute a command
    const executeCommand = useCallback(
      async (command: Command, input?: string) => {
        if (!command) return;

        try {
          await searchService.executeCommand(command, input);
          onClose?.();
        } catch (error) {
          handleError(error, `Failed to execute command: ${command.id}`);
        }
      },
      [onClose, handleError],
    );

    // Enter command mode
    const enterCommandMode = useCallback((command: Command) => {
      setActiveCommand(command);
      setViewMode("command");
      setCommandSubInput("");
      setSelectedIndex(0);

      // Focus sub-input after a short delay
      setTimeout(() => {
        if (subInputRef.current) {
          subInputRef.current.focus();
        }
      }, 50);
    }, []);

    // Go back to main mode
    const handleBackToMain = useCallback(() => {
      setViewMode("main");
      setActiveCommand(null);
      setCommandSubInput("");
      setSelectedIndex(0);

      // Focus main input after a short delay
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }, []);

    // Open alias manager
    const handleOpenAliasManager = useCallback(() => {
      setViewMode("alias-manager");
    }, []);

    // Close alias manager
    const handleCloseAliasManager = useCallback(async () => {
      setViewMode("main");
      try {
        await searchService.refreshCommandAliases();
        setCommandMatches([]);

        // Focus main input
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 50);
      } catch (error) {
        handleError(error, "Failed to refresh command aliases");
      }
    }, [handleError]);

    // Handle pipeline selection
    const handlePipelineSelect = useCallback(
      (pipeline: Pipeline) => {
        if (!pipeline) return;

        userPreferencesService
          .addRecentPipeline(pipeline.organization, pipeline.slug)
          .catch((error) => {
            handleError(error, "Failed to add recent pipeline");
          });

        window.location.href = `https://buildkite.com/${pipeline.organization}/${pipeline.slug}`;
      },
      [handleError],
    );

    // Handle input changes
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // Don't update state if value hasn't changed - prevents unnecessary rerenders
        if (newValue === input) return;

        setInput(newValue);
        // Only update search status when it changes to avoid rerenders
        const isSearchingNow = newValue.trim().length > 0;
        if (isSearchingNow !== isSearching) {
          setIsSearching(isSearchingNow);
        }
      },
      [input, isSearching],
    );

    // Handle command sub-input changes
    const handleCommandSubInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // Don't update state if value hasn't changed
        if (newValue === commandSubInput) return;

        setCommandSubInput(newValue);
        // Only update search status when it changes
        const isSearchingNow = newValue.trim().length > 0;
        if (isSearchingNow !== isSearching) {
          setIsSearching(isSearchingNow);
        }
      },
      [commandSubInput, isSearching],
    );

    // Search for pipelines with debouncing
    const searchPipelines = useCallback(
      async (searchTerm: string, limit: number = 5) => {
        try {
          return await searchService.searchPipelines(searchTerm, limit);
        } catch (error) {
          handleError(error, "Failed to search pipelines");
          return [];
        }
      },
      [handleError],
    );

    // Update commands/pipelines when input changes in main mode
    useEffect(() => {
      if (viewMode !== "main") return;

      // Clear any existing debounce timer
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }

      // Always show commands when box first opens with empty input
      if (!input.trim()) {
        setPipelineSuggestions([]);

        // Use async function to search commands
        const fetchCommands = async () => {
          try {
            const matches = await searchService.searchCommands("");
            setCommandMatches(matches);
          } catch (error) {
            handleError(error, "Failed to search commands");
            setCommandMatches([]);
          }
        };

        fetchCommands();
        return;
      }

      // Set that we're searching
      setIsSearching(true);

      // Debounce search operations
      searchDebounceRef.current = setTimeout(async () => {
        try {
          // Run searches in parallel for better performance
          const [commandResults, pipelineResults] = await Promise.all([
            searchService.searchCommands(input),
            searchPipelines(input, 7),
          ]);

          setCommandMatches(commandResults);
          setPipelineSuggestions(pipelineResults);
        } catch (error) {
          handleError(error, "Failed to search");
          setCommandMatches([]);
          setPipelineSuggestions([]);
        } finally {
          setIsSearching(false);
          searchDebounceRef.current = null;
        }
      }, 200); // 200ms debounce

      // Cleanup function
      return () => {
        if (searchDebounceRef.current) {
          clearTimeout(searchDebounceRef.current);
          searchDebounceRef.current = null;
        }
      };
    }, [input, viewMode, searchPipelines, handleError]);

    // Update pipeline suggestions in command mode
    useEffect(() => {
      if (viewMode !== "command" || !activeCommand) return;

      // Clear any existing debounce timer
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }

      // Show recent pipelines when no input
      if (
        !commandSubInput.trim() &&
        (activeCommand.id === "pipeline" || activeCommand.id === "new-build")
      ) {
        // Only fetch if we don't already have recent pipelines
        if (pipelineSuggestions.length === 0) {
          // Get recent pipelines
          searchService
            .getRecentPipelines(5)
            .then((pipelines) => {
              if (pipelines.length > 0) {
                const recentPipelineSuggestions = pipelines.map((pipeline) => ({
                  pipeline,
                  score: 1,
                }));
                setPipelineSuggestions(recentPipelineSuggestions);
              } else {
                setPipelineSuggestions([]);
              }
            })
            .catch((error) =>
              handleError(error, "Failed to get recent pipelines"),
            );
        }
        return;
      }

      // Update search status if needed
      if (!isSearching && commandSubInput.trim().length > 0) {
        setIsSearching(true);
      }

      // Debounce search operations
      searchDebounceRef.current = setTimeout(async () => {
        if (
          activeCommand.id === "pipeline" ||
          activeCommand.id === "new-build"
        ) {
          try {
            const matches = await searchPipelines(commandSubInput, 7);
            setPipelineSuggestions(matches);
          } catch (error) {
            handleError(error, "Failed to search pipelines");
            setPipelineSuggestions([]);
          } finally {
            setIsSearching(false);
            searchDebounceRef.current = null;
          }
        } else {
          setIsSearching(false);
          searchDebounceRef.current = null;
        }
      }, 200); // 200ms debounce

      // Cleanup function
      return () => {
        if (searchDebounceRef.current) {
          clearTimeout(searchDebounceRef.current);
          searchDebounceRef.current = null;
        }
      };
    }, [
      commandSubInput,
      viewMode,
      activeCommand,
      searchPipelines,
      handleError,
      isSearching,
      pipelineSuggestions.length,
    ]);

    // Handle click outside to close
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          boxRef.current &&
          !boxRef.current.contains(event.target as Node) &&
          isVisible
        ) {
          onClose?.();
        }
      };

      if (isVisible) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isVisible, onClose]);

    // Get current state values for keyboard navigation
    const hasCommands = commandMatches.length > 0;
    const hasPipelines = pipelineSuggestions.length > 0;
    const totalCommandsCount = commandMatches.length;
    const totalPipelinesCount = pipelineSuggestions.length;

    // Calculate max index (simple enough to not need useMemo)
    const maxIndex =
      selectedSection === "commands"
        ? Math.max(0, totalCommandsCount - 1)
        : Math.max(0, totalPipelinesCount - 1);

    // Handle keyboard navigation in main mode
    const handleMainModeKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        // Handle Escape key
        if (event.key === "Escape") {
          onClose?.();
          event.preventDefault();
          return;
        }

        // Don't do any navigation if there are no results
        if (!hasCommands && !hasPipelines) return;

        // Switch sections with Tab key
        if (event.key === "Tab") {
          event.preventDefault();
          if (hasCommands && hasPipelines) {
            // Only switch if there are results in both sections
            const newSection =
              selectedSection === "commands" ? "pipelines" : "commands";
            setSelectedSection(newSection);
            setSelectedIndex(0);
          }
          return;
        }

        // Handle Arrow navigation and Enter
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            setSelectedIndex((prevIndex) => Math.max(0, prevIndex - 1));
            break;
          case "ArrowDown":
            event.preventDefault();
            setSelectedIndex((prevIndex) => Math.min(maxIndex, prevIndex + 1));
            break;
          case "Enter":
            event.preventDefault();
            if (
              selectedSection === "commands" &&
              selectedIndex < totalCommandsCount
            ) {
              const selectedCommand = commandMatches[selectedIndex].command;
              if (selectedCommand.hasSubInput) {
                enterCommandMode(selectedCommand);
              } else {
                executeCommand(selectedCommand);
              }
            } else if (
              selectedSection === "pipelines" &&
              selectedIndex < totalPipelinesCount
            ) {
              handlePipelineSelect(pipelineSuggestions[selectedIndex].pipeline);
            }
            break;
        }
      },
      [
        hasCommands,
        hasPipelines,
        selectedSection,
        selectedIndex,
        maxIndex,
        totalCommandsCount,
        totalPipelinesCount,
        commandMatches,
        pipelineSuggestions,
        enterCommandMode,
        executeCommand,
        handlePipelineSelect,
        onClose,
      ],
    );

    // Handle keyboard navigation in command mode
    const handleCommandModeKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        // Handle Escape key to go back to main mode
        if (event.key === "Escape") {
          handleBackToMain();
          event.preventDefault();
          return;
        }

        // For pipeline commands, handle navigation and selection
        if (
          (activeCommand?.id === "pipeline" ||
            activeCommand?.id === "new-build") &&
          pipelineSuggestions.length > 0
        ) {
          switch (event.key) {
            case "ArrowUp":
              event.preventDefault();
              setSelectedIndex((prev) => Math.max(0, prev - 1));
              break;
            case "ArrowDown":
              event.preventDefault();
              setSelectedIndex((prev) =>
                Math.min(pipelineSuggestions.length - 1, prev + 1),
              );
              break;
            case "Enter":
              event.preventDefault();
              if (selectedIndex < pipelineSuggestions.length) {
                const selectedPipeline =
                  pipelineSuggestions[selectedIndex].pipeline;
                if (activeCommand.id === "pipeline") {
                  handlePipelineSelect(selectedPipeline);
                } else if (activeCommand.id === "new-build") {
                  executeCommand(
                    activeCommand,
                    `${selectedPipeline.organization}/${selectedPipeline.slug}`,
                  );
                }
              } else {
                // Just execute the command with current input if no selection
                executeCommand(activeCommand, commandSubInput);
              }
              break;
          }
        } else if (event.key === "Enter") {
          // For other commands, execute on Enter
          event.preventDefault();
          executeCommand(activeCommand!, commandSubInput);
        }
      },
      [
        activeCommand,
        pipelineSuggestions,
        selectedIndex,
        commandSubInput,
        executeCommand,
        handleBackToMain,
        handlePipelineSelect,
      ],
    );

    // Reset selected index when switching sections or when items change
    useEffect(() => {
      setSelectedIndex(0);
    }, [selectedSection, commandMatches.length, pipelineSuggestions.length]);

    // Determine which component to render based on view mode
    const renderContent = () => {
      switch (viewMode) {
        case "main":
          return (
            <ErrorBoundary fallbackMessage="Something went wrong loading the command palette">
              <MainMode
                input={input}
                onInputChange={handleInputChange}
                onInputChangeImmediate={(value) =>
                  setIsSearching(value.trim().length > 0)
                }
                isSearching={isSearching}
                commandMatches={commandMatches}
                pipelineSuggestions={pipelineSuggestions}
                selectedIndex={selectedIndex}
                selectedSection={selectedSection}
                onSectionChange={setSelectedSection}
                onIndexChange={setSelectedIndex}
                onCommandSelect={(command) => {
                  if (command.hasSubInput) {
                    enterCommandMode(command);
                  } else {
                    executeCommand(command);
                  }
                }}
                onPipelineSelect={handlePipelineSelect}
                onOpenAliasManager={handleOpenAliasManager}
                onKeyDown={handleMainModeKeyDown}
                inputRef={inputRef}
                resultsContainerRef={resultsRef}
                onClose={onClose}
              />
            </ErrorBoundary>
          );
        case "command":
          return (
            <ErrorBoundary fallbackMessage="Something went wrong in command mode">
              <CommandMode
                command={activeCommand!}
                input={commandSubInput}
                onInputChange={handleCommandSubInputChange}
                isSearching={isSearching}
                pipelineSuggestions={pipelineSuggestions}
                selectedIndex={selectedIndex}
                onIndexChange={setSelectedIndex}
                onPipelineSelect={(pipeline) => {
                  if (activeCommand?.id === "pipeline") {
                    handlePipelineSelect(pipeline);
                  } else if (activeCommand?.id === "new-build") {
                    executeCommand(
                      activeCommand,
                      `${pipeline.organization}/${pipeline.slug}`,
                    );
                  }
                }}
                onExecute={(input) => executeCommand(activeCommand!, input)}
                onBack={handleBackToMain}
                onKeyDown={handleCommandModeKeyDown}
                inputRef={subInputRef}
                resultsContainerRef={resultsRef}
              />
            </ErrorBoundary>
          );
        case "alias-manager":
          return (
            <ErrorBoundary fallbackMessage="Something went wrong in alias manager">
              <CommandAliasManager onClose={handleCloseAliasManager} />
            </ErrorBoundary>
          );
        default:
          return null;
      }
    };

    // Render component
    return (
      <div className={`cmd-k-wrapper ${isVisible ? "visible" : ""}`}>
        <div
          ref={boxRef}
          className="cmd-k-box"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cmd-k-title"
        >
          <div className="cmd-k-header">
            <h2 id="cmd-k-title" className="cmd-k-header-title">
              {viewMode === "main"
                ? "Command Palette"
                : viewMode === "command"
                  ? activeCommand?.name || "Command"
                  : "Command Aliases"}
            </h2>

            <ThemeToggle size="small" />
          </div>

          {renderContent()}
        </div>
      </div>
    );
  },
);
