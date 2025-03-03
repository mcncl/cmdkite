import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
  useMemo,
} from "react";
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
import { DebouncedInput } from "../DebouncedInput";
import { VirtualizedList } from "../VirtualizedList";
import { ErrorBoundary } from "../ErrorBoundary";

// Define view modes
type ViewMode = "main" | "command" | "alias-manager";

// Inner component for optimization with memo
const CommandBoxInner: React.FC<CommandBoxProps> = memo(
  ({ onClose, isVisible = false }) => {
    // Initialize search service with a ref to prevent recreation
    const searchServiceRef = useRef(new SearchService());

    // State - split into smaller pieces to avoid unnecessary re-renders
    const [input, setInput] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("main");
    const [activeCommand, setActiveCommand] = useState<Command | null>(null);
    const [commandSubInput, setCommandSubInput] = useState("");
    const [pipelineSuggestions, setPipelineSuggestions] = useState<
      PipelineSuggestion[]
    >([]);
    const [commandMatches, setCommandMatches] = useState<CommandMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Error handling
    const { handleError } = useErrorHandler();

    // Refs
    const boxRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const subInputRef = useRef<HTMLInputElement>(null);

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

    // Memoized handlers
    const executeCommand = useCallback(
      async (command: Command, input?: string) => {
        if (!command) return;

        try {
          await searchServiceRef.current.executeCommand(command, input);
          onClose?.();
        } catch (error) {
          handleError(error, `Failed to execute command: ${command.id}`);
        }
      },
      [onClose, handleError],
    );

    const enterCommandMode = useCallback((command: Command) => {
      setActiveCommand(command);
      setViewMode("command");
      setCommandSubInput("");

      // Focus sub-input after a short delay to ensure it exists
      setTimeout(() => {
        if (subInputRef.current) {
          subInputRef.current.focus();
        }
      }, 50);
    }, []);

    const handleBackToMain = useCallback(() => {
      setViewMode("main");
      setActiveCommand(null);
      setCommandSubInput("");

      // Focus main input after a short delay
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }, []);

    const handleOpenAliasManager = useCallback(() => {
      setViewMode("alias-manager");
    }, []);

    const handleCloseAliasManager = useCallback(async () => {
      // Refresh command aliases when returning from alias manager
      setViewMode("main");
      try {
        await searchServiceRef.current.refreshCommandAliases();

        // Clear command matches to force a refresh
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

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
      },
      [],
    );

    // For UI updates during typing (before debounce)
    const handleInputChangeImmediate = useCallback((value: string) => {
      setIsSearching(value.trim().length > 0);
    }, []);

    const handleCommandSubInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setCommandSubInput(e.target.value);
      },
      [],
    );

    // Enhanced pipeline search function with memoization
    const searchPipelines = useCallback(
      async (searchTerm: string, limit: number = 5) => {
        try {
          return await searchServiceRef.current.searchPipelines(
            searchTerm,
            limit,
          );
        } catch (error) {
          handleError(error, "Failed to search pipelines");
          return [];
        }
      },
      [handleError],
    );

    // Update suggestions/commands when input changes in main view with debouncing
    useEffect(() => {
      if (viewMode !== "main") return;

      // Always show commands when box first opens with empty input
      if (!input.trim()) {
        setPipelineSuggestions([]);
        // Use async function to search commands with alias support
        const fetchCommands = async () => {
          try {
            // Get all available commands when input is empty
            const matches = await searchServiceRef.current.searchCommands("");
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

      // Search for commands and pipelines
      const performSearch = async () => {
        try {
          // Run searches in parallel for better performance
          const [commandResults, pipelineResults] = await Promise.all([
            searchServiceRef.current.searchCommands(input),
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
        }
      };

      performSearch();
    }, [input, viewMode, searchPipelines, handleError]);

    // Update pipeline suggestions in command mode
    useEffect(() => {
      if (viewMode !== "command" || !activeCommand) return;

      // Show recent pipelines when no input
      if (
        !commandSubInput.trim() &&
        (activeCommand.id === "pipeline" || activeCommand.id === "new-build")
      ) {
        // Get recent pipelines from searchService
        searchServiceRef.current
          .getRecentPipelines(5)
          .then((pipelines) => {
            if (pipelines.length > 0) {
              const recentPipelineSuggestions = pipelines.map((pipeline) => ({
                pipeline,
                score: 1,
              }));
              setPipelineSuggestions(recentPipelineSuggestions);
            }
          })
          .catch((error) =>
            handleError(error, "Failed to get recent pipelines"),
          );
        return;
      }

      // Set that we're searching
      setIsSearching(true);

      // Debounce search operations
      const searchTimer = setTimeout(async () => {
        if (
          activeCommand.id === "pipeline" ||
          activeCommand.id === "new-build"
        ) {
          try {
            const matches = await searchPipelines(commandSubInput, 7);
            setPipelineSuggestions(matches);
          } catch (error) {
            handleError(error, "Failed to search pipelines");
          } finally {
            setIsSearching(false);
          }
        } else {
          setIsSearching(false);
        }
      }, 200);

      return () => clearTimeout(searchTimer);
    }, [
      commandSubInput,
      viewMode,
      activeCommand,
      searchPipelines,
      handleError,
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

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isVisible, onClose]);

    // Handle keyboard navigation and selection
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedSection, setSelectedSection] = useState<
      "commands" | "pipelines"
    >("commands");

    // Get total count of selectable items
    const totalCommandsCount = commandMatches.length;
    const totalPipelinesCount = pipelineSuggestions.length;
    const hasCommands = totalCommandsCount > 0;
    const hasPipelines = totalPipelinesCount > 0;

    // Calculate max index based on visible sections
    const maxIndex = useMemo(() => {
      return selectedSection === "commands"
        ? Math.max(0, totalCommandsCount - 1)
        : Math.max(0, totalPipelinesCount - 1);
    }, [selectedSection, totalCommandsCount, totalPipelinesCount]);

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

    // Update selected index when items change
    useEffect(() => {
      setSelectedIndex(0);
    }, [commandMatches, pipelineSuggestions, selectedSection]);

    // Create memoized result counters
    const resultCounts = useMemo(
      () => ({
        commands: commandMatches.length,
        pipelines: pipelineSuggestions.length,
      }),
      [commandMatches.length, pipelineSuggestions.length],
    );

    // Determine which component to render based on view mode
    const renderContent = () => {
      switch (viewMode) {
        case "main":
          return (
            <ErrorBoundary fallbackMessage="Something went wrong loading the command palette">
              <MainMode
                input={input}
                onInputChange={handleInputChange}
                onInputChangeImmediate={handleInputChangeImmediate}
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
      <div
        className={`cmd-k ${isVisible ? "visible" : "hidden"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmd-k-title"
      >
        <div className="cmd-k-backdrop" onClick={onClose} />

        <div
          ref={boxRef}
          className="cmd-k-box"
          role="combobox"
          aria-expanded={isVisible}
          aria-haspopup="listbox"
        >
          <div className="cmd-k-header">
            <h2 id="cmd-k-title" className="cmd-k-title">
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

/**
 * CommandBox - optimized command palette component
 * Uses memoization, virtualized lists, and debounced inputs
 * for maximum performance.
 */
export const CommandBox: React.FC<CommandBoxProps> = (props) => {
  return <CommandBoxInner {...props} />;
};
