import React, { useState, useEffect, useCallback, useRef } from "react";
import { SearchService, searchService } from "../../services/searchService";
import { userPreferencesService } from "../../services/preferences";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import type {
  Command,
  Pipeline,
  CommandMatch,
  PipelineSuggestion,
} from "../../types";

interface CommandBoxProps {
  onClose?: () => void;
  isVisible?: boolean;
}

type ViewMode = "main" | "command";

export const CommandBox: React.FC<CommandBoxProps> = ({
  onClose,
  isVisible = false,
}) => {
  // State with stable defaults
  const [input, setInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [activeCommand, setActiveCommand] = useState<Command | null>(null);
  const [commandSubInput, setCommandSubInput] = useState("");
  const [pipelineSuggestions, setPipelineSuggestions] = useState<
    PipelineSuggestion[]
  >([]);
  const [commandMatches, setCommandMatches] = useState<CommandMatch[]>([]);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchServiceRef = useRef<SearchService>(new SearchService());

  // Reset state when closing - this is important to avoid state pollution
  useEffect(() => {
    if (!isVisible) {
      setInput("");
      setPipelineSuggestions([]);
      setCommandMatches([]);
      setViewMode("main");
      setActiveCommand(null);
      setCommandSubInput("");
    }
  }, [isVisible]);

  // Focus input when becoming visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Memoized handler for executing commands
  const executeCommand = useCallback(
    (command: Command, input?: string) => {
      if (!command) return;
      searchServiceRef.current.executeCommand(command, input);
      onClose?.();
    },
    [onClose],
  );

  // Enter command mode
  const enterCommandMode = useCallback((command: Command) => {
    setActiveCommand(command);
    setViewMode("command");
    setCommandSubInput("");

    // Use setTimeout to ensure DOM is updated before focusing
    setTimeout(() => {
      if (commandInputRef.current) {
        commandInputRef.current.focus();
      }
    }, 10);
  }, []);

  // Memoized handler for going back to main mode
  const handleBackToMain = useCallback(() => {
    setViewMode("main");
    setActiveCommand(null);
    setCommandSubInput("");

    // Ensure main input gets focus when going back
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  }, []);

  // Memoized handler for selecting pipelines
  const handlePipelineSelect = useCallback((pipeline: Pipeline) => {
    if (!pipeline) return;

    userPreferencesService
      .addRecentPipeline(pipeline.organization, pipeline.slug)
      .catch((error) => {
        console.error("Failed to add recent pipeline:", error);
      });

    window.location.href = `https://buildkite.com/${pipeline.organization}/${pipeline.slug}`;
  }, []);

  // Handler for input changes in main mode
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
    },
    [],
  );

  // Handler for input changes in command mode
  const handleCommandSubInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCommandSubInput(e.target.value);
    },
    [],
  );

  // Enhanced pipeline search function with improved fuzzy matching
  const searchPipelines = useCallback(
    async (searchTerm: string, limit: number = 5) => {
      return searchService.searchPipelines(searchTerm, limit);
    },
    [],
  );

  // Update suggestions/commands when input changes in main view - optimized
  useEffect(() => {
    if (viewMode !== "main") return;

    // Always show commands when box first opens with empty input
    if (!input.trim()) {
      setPipelineSuggestions([]);
      setCommandMatches(searchService.searchCommands(""));
      return;
    }

    // Debounce expensive search operations
    const handler = setTimeout(async () => {
      // Get matching commands using searchService
      const matches = searchService.searchCommands(input);
      setCommandMatches(matches);

      // Search for pipelines using the searchService
      const pipelineMatches = await searchPipelines(input);
      setPipelineSuggestions(pipelineMatches);
    }, 120);

    return () => clearTimeout(handler);
  }, [input, viewMode, searchPipelines]);

  // Update pipeline suggestions in command mode - with improved search experience
  useEffect(() => {
    if (viewMode !== "command" || !activeCommand) return;

    // Show recent pipelines when no input
    if (
      !commandSubInput.trim() &&
      (activeCommand.id === "pipeline" || activeCommand.id === "new-build")
    ) {
      // Get recent pipelines from searchService
      searchService
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
        .catch(console.error);
      return;
    }

    // Debounce search operations
    const handler = setTimeout(async () => {
      if (activeCommand.id === "pipeline" || activeCommand.id === "new-build") {
        const matches = await searchPipelines(commandSubInput, 7);
        setPipelineSuggestions(matches);
      }
    }, 100);

    return () => clearTimeout(handler);
  }, [commandSubInput, viewMode, activeCommand, searchPipelines]);

  // Handle click outside to close
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, onClose]);

  const renderRecentSearches = async () => {
    // Only show in main view with empty input
    if (viewMode !== "main" || input.trim()) {
      return null;
    }

    const recentSearches = await searchService.getRecentSearches();

    if (recentSearches.length === 0) {
      return null;
    }

    return (
      <div className="cmd-k-results-section">
        <div className="cmd-k-section-title">Recent Searches</div>
        <div>
          {recentSearches.slice(0, 5).map((search, index) => (
            <div
              key={`search-${index}`}
              className="cmd-k-command"
              onClick={() => {
                setInput(search);
              }}
            >
              <div className="cmd-k-command-name">
                <span style={{ marginRight: "8px" }}>🔍</span>
                {search}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Main view keyboard navigation configuration
  const mainViewKeyboardConfig = {
    sections: [
      {
        id: "commands",
        items: commandMatches.map((match) => match.command),
        onItemSelect: (command: Command) => {
          if (command.id === "pipeline" || command.id === "new-build") {
            enterCommandMode(command);
          } else {
            executeCommand(command, input.split(" ").slice(1).join(" "));
          }
        },
      },
      {
        id: "pipelines",
        items: pipelineSuggestions.map((sugg) => sugg.pipeline),
        onItemSelect: handlePipelineSelect,
      },
    ],
    onEscape: onClose,
    onBackspace: (isEmpty: boolean) => {
      if (isEmpty) {
        onClose?.();
      }
    },
    containerRef: resultsRef,
    inputRef: inputRef,
    shouldScrollToSelected: true,
  };

  // Command view keyboard navigation configuration
  const commandViewKeyboardConfig = {
    sections: [
      {
        id: "suggestions",
        items: pipelineSuggestions.map((sugg) => sugg.pipeline),
        onItemSelect: (pipeline: Pipeline) => {
          setCommandSubInput(`${pipeline.organization}/${pipeline.slug}`);
          executeCommand(
            activeCommand as Command,
            `${pipeline.organization}/${pipeline.slug}`,
          );
        },
      },
    ],
    onEscape: handleBackToMain,
    onBackspace: (isEmpty: boolean) => {
      if (isEmpty) {
        handleBackToMain();
      }
    },
    containerRef: resultsRef,
    inputRef: commandInputRef,
    shouldScrollToSelected: true,
  };

  // Initialize keyboard navigation hooks for both view modes
  const mainNavigation = useKeyboardNavigation(mainViewKeyboardConfig);
  const commandNavigation = useKeyboardNavigation(commandViewKeyboardConfig);

  // Get the active keyboard navigation based on current view mode
  const activeNavigation =
    viewMode === "main" ? mainNavigation : commandNavigation;

  // Main keyboard handler that delegates to the appropriate navigation hook
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      return activeNavigation.handleKeyDown(e);
    },
    [activeNavigation],
  );

  // Only render the component when it's visible
  if (!isVisible) return null;

  // Render the appropriate view
  return (
    <div className="cmd-k-wrapper visible">
      <div ref={boxRef} className="cmd-k-box">
        {/* Main view */}
        {viewMode === "main" && (
          <>
            <input
              ref={inputRef}
              className="cmd-k-input"
              placeholder="Search commands and pipelines..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />

            <div ref={resultsRef} className="cmd-k-results">
              {/* Commands section */}
              {commandMatches.length > 0 && (
                <div className="cmd-k-results-section">
                  <div className="cmd-k-section-title" id="commands-section">
                    Commands
                  </div>
                  <div role="listbox" aria-labelledby="commands-section">
                    {commandMatches.map(({ command }, index) => (
                      <div
                        key={command.id}
                        className={`cmd-k-command ${
                          index === mainNavigation.selectedIndex
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => {
                          if (
                            command.id === "pipeline" ||
                            command.id === "new-build"
                          ) {
                            enterCommandMode(command);
                          } else {
                            executeCommand(
                              command,
                              input.split(" ").slice(1).join(" "),
                            );
                          }
                        }}
                        role="option"
                        aria-selected={index === mainNavigation.selectedIndex}
                      >
                        <div className="cmd-k-command-header">
                          <div className="cmd-k-command-name">
                            {command.name}
                          </div>
                          <div className="cmd-k-command-id">/{command.id}</div>
                        </div>
                        <div className="cmd-k-command-description">
                          {command.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pipeline results */}
              {pipelineSuggestions.length > 0 && (
                <div className="cmd-k-results-section">
                  <div className="cmd-k-section-title" id="pipelines-section">
                    Pipelines
                  </div>
                  <div role="listbox" aria-labelledby="pipelines-section">
                    {pipelineSuggestions.map(({ pipeline }, index) => {
                      const globalIndex = index + commandMatches.length;
                      return (
                        <div
                          key={`${pipeline.organization}/${pipeline.slug}`}
                          className={`cmd-k-result ${
                            globalIndex === mainNavigation.selectedIndex
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => handlePipelineSelect(pipeline)}
                          role="option"
                          aria-selected={
                            globalIndex === mainNavigation.selectedIndex
                          }
                        >
                          <div className="cmd-k-pipeline">
                            <div className="cmd-k-pipeline-info">
                              <div className="cmd-k-pipeline-name">
                                {pipeline.emoji && (
                                  <span style={{ marginRight: "8px" }}>
                                    {pipeline.emoji}
                                  </span>
                                )}
                                {pipeline.name}
                              </div>
                              {pipeline.description && (
                                <div className="cmd-k-pipeline-description">
                                  {pipeline.description}
                                </div>
                              )}
                              <div className="cmd-k-pipeline-org">
                                {pipeline.organization}/{pipeline.slug}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {input &&
                !commandMatches.length &&
                !pipelineSuggestions.length && (
                  <div className="cmd-k-empty-state">
                    No matching results found
                  </div>
                )}
            </div>
          </>
        )}

        {/* Command input view (second step) */}
        {viewMode === "command" && activeCommand && (
          <>
            <div className="cmd-k-command-header-bar">
              <div className="cmd-k-command-title">
                <span className="cmd-k-command-name">{activeCommand.name}</span>
                <button
                  className="cmd-k-back-button"
                  onClick={handleBackToMain}
                  aria-label="Back to main menu"
                >
                  ← Back
                </button>
              </div>
            </div>

            <input
              ref={commandInputRef}
              className="cmd-k-input cmd-k-command-input"
              placeholder={
                activeCommand.id === "pipeline"
                  ? "Search pipelines..."
                  : activeCommand.id === "new-build"
                    ? "Search pipelines to create a build..."
                    : "Enter parameters..."
              }
              value={commandSubInput}
              onChange={handleCommandSubInputChange}
              onKeyDown={handleKeyDown}
            />

            {/* Pipeline results for command mode */}
            {pipelineSuggestions.length > 0 && (
              <div ref={resultsRef} className="cmd-k-results">
                <div className="cmd-k-results-section">
                  <div
                    id="command-pipelines-section"
                    className="cmd-k-section-title"
                  >
                    Pipelines
                  </div>
                  <div
                    role="listbox"
                    aria-labelledby="command-pipelines-section"
                  >
                    {pipelineSuggestions.map(({ pipeline }, index) => (
                      <div
                        key={`${pipeline.organization}/${pipeline.slug}`}
                        className={`cmd-k-result ${
                          index === commandNavigation.selectedIndex
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => {
                          setCommandSubInput(
                            `${pipeline.organization}/${pipeline.slug}`,
                          );
                          executeCommand(
                            activeCommand,
                            `${pipeline.organization}/${pipeline.slug}`,
                          );
                        }}
                        role="option"
                        aria-selected={
                          index === commandNavigation.selectedIndex
                        }
                      >
                        <div className="cmd-k-pipeline">
                          <div className="cmd-k-pipeline-info">
                            <div className="cmd-k-pipeline-name">
                              {pipeline.emoji && (
                                <span style={{ marginRight: "8px" }}>
                                  {pipeline.emoji}
                                </span>
                              )}
                              {pipeline.name}
                            </div>
                            {pipeline.description && (
                              <div className="cmd-k-pipeline-description">
                                {pipeline.description}
                              </div>
                            )}
                            <div className="cmd-k-pipeline-org">
                              {pipeline.organization}/{pipeline.slug}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {commandSubInput && !pipelineSuggestions.length && (
              <div className="cmd-k-empty-state">
                No matching pipelines found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
