import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { CommandManager } from "../../services/commandManager";
import { userPreferencesService } from "../../services/preferences";
import { cachedPipelines, fetchPipelines } from "../../commands/pipeline";
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
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const commandManagerRef = useRef<CommandManager>(new CommandManager());

  // Only calculate the fuzzy match function once
  const fuzzyMatch = useMemo(() => {
    return (text: string, search: string): number => {
      if (!search.trim() || !text) return 0;

      const textLower = text.toLowerCase();
      const searchLower = search.toLowerCase();

      if (textLower === searchLower) return 100;
      if (textLower.includes(searchLower)) return 80;

      let score = 0;
      let searchIndex = 0;
      let consecutiveMatches = 0;

      for (
        let i = 0;
        i < textLower.length && searchIndex < searchLower.length;
        i++
      ) {
        if (textLower[i] === searchLower[searchIndex]) {
          score += 10 + consecutiveMatches;
          consecutiveMatches++;
          searchIndex++;
        } else {
          consecutiveMatches = 0;
        }
      }

      return searchIndex === searchLower.length ? score : 0;
    };
  }, []);

  // Reset state when closing - this is important to avoid state pollution
  useEffect(() => {
    if (!isVisible) {
      setInput("");
      setPipelineSuggestions([]);
      setCommandMatches([]);
      setSelectedIndex(0);
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
      commandManagerRef.current.executeCommand(command, input);
      onClose?.();
    },
    [onClose],
  );

  const enterCommandMode = useCallback((command: Command) => {
    setActiveCommand(command);
    setViewMode("command");
    setCommandSubInput("");
    setSelectedIndex(0);

    // Use setTimeout to ensure DOM is updated before focusing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  }, []);

  // Memoized handler for going back to main mode
  const handleBackToMain = useCallback(() => {
    setViewMode("main");
    setActiveCommand(null);
    setCommandSubInput("");
    setSelectedIndex(0);

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

  // Handler for input changes in main mode - debounced internally
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
    (searchTerm: string, limit: number = 5) => {
      if (!searchTerm.trim() || cachedPipelines.length === 0) {
        return [];
      }

      const terms = searchTerm
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      return cachedPipelines
        .map((pipeline) => {
          // Check multiple fields for matching
          const nameLower = pipeline.name.toLowerCase();
          const slugLower = pipeline.slug.toLowerCase();
          const orgLower = pipeline.organization.toLowerCase();
          const descLower = (pipeline.description || "").toLowerCase();
          const fullPath = `${orgLower}/${slugLower}`;

          // Calculate scores for different matching strategies
          let totalScore = 0;

          // Exact matches (highest priority)
          if (nameLower === searchTerm.toLowerCase()) totalScore += 100;
          if (slugLower === searchTerm.toLowerCase()) totalScore += 90;
          if (fullPath === searchTerm.toLowerCase()) totalScore += 80;

          // Starting matches
          if (nameLower.startsWith(searchTerm.toLowerCase())) totalScore += 70;
          if (slugLower.startsWith(searchTerm.toLowerCase())) totalScore += 60;
          if (fullPath.startsWith(searchTerm.toLowerCase())) totalScore += 50;

          // Contains matches
          if (nameLower.includes(searchTerm.toLowerCase())) totalScore += 40;
          if (slugLower.includes(searchTerm.toLowerCase())) totalScore += 30;
          if (fullPath.includes(searchTerm.toLowerCase())) totalScore += 25;
          if (descLower.includes(searchTerm.toLowerCase())) totalScore += 20;

          // Handle multi-term searches (e.g., "frontend deploy")
          if (terms.length > 1) {
            const matchedTerms = terms.filter(
              (term) =>
                nameLower.includes(term) ||
                slugLower.includes(term) ||
                fullPath.includes(term) ||
                descLower.includes(term),
            );

            // Bonus for matching multiple terms
            if (matchedTerms.length === terms.length) {
              totalScore += 40; // Bonus for matching all terms
            } else if (matchedTerms.length > 0) {
              totalScore += 15 * matchedTerms.length; // Partial bonus
            }
          }

          // Character-by-character fuzzy matching for lower but still relevant results
          if (totalScore === 0) {
            const nameScore = fuzzyMatch(pipeline.name, searchTerm) * 1.2;
            const slugScore = fuzzyMatch(pipeline.slug, searchTerm);
            const pathScore = fuzzyMatch(fullPath, searchTerm);

            totalScore = Math.max(nameScore, slugScore, pathScore);
          }

          return {
            pipeline,
            score: totalScore,
          };
        })
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    [fuzzyMatch],
  );

  // Update suggestions/commands when input changes in main view - optimized
  useEffect(() => {
    if (viewMode !== "main") return;

    // Always show commands when box first opens with empty input
    if (!input.trim()) {
      setPipelineSuggestions([]);
      setCommandMatches(
        commandManagerRef.current.getAllAvailableCommands().map((command) => ({
          command,
          score: 1,
        })),
      );
      setSelectedIndex(0);
      return;
    }

    // Debounce expensive search operations
    const handler = setTimeout(() => {
      // First check if it's a command search (starting with /)
      if (input.startsWith("/")) {
        const commandId = input.slice(1).trim();
        const directMatches = commandManagerRef.current
          .getAllAvailableCommands()
          .filter((cmd) => cmd.id === commandId)
          .map((command) => ({ command, score: 100 }));

        if (directMatches.length > 0) {
          setCommandMatches(directMatches);
          setPipelineSuggestions([]);
          setSelectedIndex(0);
          return;
        }
      }

      // Get matching commands
      const matches = commandManagerRef.current.matchCommands(input);
      setCommandMatches(matches);

      // Always search pipelines with non-empty input
      if (cachedPipelines.length > 0) {
        // Fetch pipelines on first search if we don't have any
        if (cachedPipelines.length === 0) {
          fetchPipelines().catch(console.error);
          setPipelineSuggestions([]);
        } else {
          const pipelineMatches = searchPipelines(input);
          setPipelineSuggestions(pipelineMatches);
        }
      }

      // Reset selection index when results change
      setSelectedIndex(0);
    }, 120); // Slightly longer debounce for better performance while typing

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
      // If we have pipelines, show some top ones as suggestions
      if (cachedPipelines.length > 0) {
        const recentPipelines = cachedPipelines
          .slice(0, 5)
          .map((pipeline) => ({ pipeline, score: 1 }));
        setPipelineSuggestions(recentPipelines);
      } else {
        // Try to fetch pipelines if we don't have any
        fetchPipelines()
          .then(() => {
            if (cachedPipelines.length > 0) {
              const initialPipelines = cachedPipelines
                .slice(0, 5)
                .map((pipeline) => ({ pipeline, score: 1 }));
              setPipelineSuggestions(initialPipelines);
            }
          })
          .catch((error) => {
            console.error("Failed to fetch pipelines:", error);
            setPipelineSuggestions([]);
          });
      }
      return;
    }

    // Debounce search operations
    const handler = setTimeout(() => {
      if (activeCommand.id === "pipeline" || activeCommand.id === "new-build") {
        const matches = searchPipelines(commandSubInput, 7);
        setPipelineSuggestions(matches);

        // Reset selection index when results change
        setSelectedIndex(0);
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

  const scrollSelectedIntoView = useCallback((index: number) => {
    requestAnimationFrame(() => {
      const selectedElement = document.querySelector(".selected");
      const resultsContainer = document.querySelector(".cmd-k-results");

      if (!selectedElement || !resultsContainer) return;

      const containerRect = resultsContainer.getBoundingClientRect();
      const selectedRect = selectedElement.getBoundingClientRect();

      // Check if element is outside visible area
      if (selectedRect.bottom > containerRect.bottom) {
        // Element is below visible area
        resultsContainer.scrollTop +=
          selectedRect.bottom - containerRect.bottom + 8;
      } else if (selectedRect.top < containerRect.top) {
        // Element is above visible area
        resultsContainer.scrollTop -= containerRect.top - selectedRect.top + 8;
      }
    });
  }, []);

  // Simple keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = commandMatches.length + pipelineSuggestions.length;
      let handled = false;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          handled = true;
          if (viewMode === "command") {
            handleBackToMain();
          } else {
            onClose?.();
          }
          break;

        case "ArrowDown":
          if (totalItems === 0) break;
          e.preventDefault();
          handled = true;
          setSelectedIndex((prev) => {
            const newIndex = prev >= totalItems - 1 ? 0 : prev + 1;
            // Schedule scroll after state update
            setTimeout(() => scrollSelectedIntoView(newIndex), 0);
            return newIndex;
          });
          break;

        case "ArrowUp":
          if (totalItems === 0) break;
          e.preventDefault();
          handled = true;
          setSelectedIndex((prev) => {
            const newIndex = prev <= 0 ? totalItems - 1 : prev - 1;
            // Schedule scroll after state update
            setTimeout(() => scrollSelectedIntoView(newIndex), 0);
            return newIndex;
          });
          break;

        case "Enter":
          if (totalItems === 0) break;
          e.preventDefault();
          handled = true;

          if (viewMode === "main") {
            if (selectedIndex < commandMatches.length) {
              const command = commandMatches[selectedIndex].command;

              if (command.id === "pipeline" || command.id === "new-build") {
                enterCommandMode(command);
              } else {
                executeCommand(command, input.split(" ").slice(1).join(" "));
              }
            } else {
              const pipelineIndex = selectedIndex - commandMatches.length;
              if (
                pipelineIndex >= 0 &&
                pipelineIndex < pipelineSuggestions.length
              ) {
                handlePipelineSelect(
                  pipelineSuggestions[pipelineIndex].pipeline,
                );
              }
            }
          } else if (viewMode === "command" && activeCommand) {
            if (selectedIndex < pipelineSuggestions.length) {
              const pipeline = pipelineSuggestions[selectedIndex].pipeline;
              setCommandSubInput(`${pipeline.organization}/${pipeline.slug}`);
              executeCommand(
                activeCommand,
                `${pipeline.organization}/${pipeline.slug}`,
              );
            } else {
              executeCommand(activeCommand, commandSubInput);
            }
          }
          break;

        case "Tab":
          // If input is empty in command mode, treat Tab like Down arrow
          if (
            viewMode === "command" &&
            !commandSubInput.trim() &&
            totalItems > 0
          ) {
            e.preventDefault();
            handled = true;
            setSelectedIndex((prev) => {
              const newIndex = prev >= totalItems - 1 ? 0 : prev + 1;
              setTimeout(() => scrollSelectedIntoView(newIndex), 0);
              return newIndex;
            });
          }
          break;
      }

      // Return true if we handled the key, false otherwise
      return handled;
    },
    [
      viewMode,
      commandMatches,
      pipelineSuggestions,
      selectedIndex,
      activeCommand,
      input,
      commandSubInput,
      executeCommand,
      handlePipelineSelect,
      onClose,
      scrollSelectedIntoView,
      enterCommandMode,
      handleBackToMain,
    ],
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

            <div className="cmd-k-results">
              {/* Commands section */}
              {commandMatches.length > 0 && (
                <div className="cmd-k-results-section">
                  <div className="cmd-k-section-title">Commands</div>
                  <div>
                    {commandMatches.map(({ command }, index) => (
                      <div
                        key={command.id}
                        className={`cmd-k-command ${
                          index === selectedIndex ? "selected" : ""
                        }`}
                        onClick={() => {
                          if (
                            command.id === "pipeline" ||
                            command.id === "new-build"
                          ) {
                            setActiveCommand(command);
                            setViewMode("command");
                            setCommandSubInput("");
                            setSelectedIndex(0);
                          } else {
                            executeCommand(
                              command,
                              input.split(" ").slice(1).join(" "),
                            );
                          }
                        }}
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
                  <div className="cmd-k-section-title">Pipelines</div>
                  <div>
                    {pipelineSuggestions.map(({ pipeline }, index) => (
                      <div
                        key={`${pipeline.organization}/${pipeline.slug}`}
                        className={`cmd-k-result ${
                          index === selectedIndex - commandMatches.length
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => handlePipelineSelect(pipeline)}
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
                  onClick={() => {
                    setViewMode("main");
                    setActiveCommand(null);
                    setCommandSubInput("");
                    setSelectedIndex(0);
                  }}
                >
                  ← Back
                </button>
              </div>
            </div>

            <input
              ref={inputRef}
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
              <div className="cmd-k-results">
                <div className="cmd-k-results-section">
                  <div>
                    {pipelineSuggestions.map(({ pipeline }, index) => (
                      <div
                        key={`${pipeline.organization}/${pipeline.slug}`}
                        className={`cmd-k-result ${
                          index === selectedIndex ? "selected" : ""
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
