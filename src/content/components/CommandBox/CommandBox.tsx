import React, { useState, useEffect, useCallback, useRef } from "react";
import { searchService } from "../../services/searchService";
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

type ViewMode = "main" | "command";

/**
 * CommandBox component that provides a command palette interface
 * for quickly navigating through Buildkite pipelines and executing commands.
 */
export const CommandBox: React.FC<CommandBoxProps> = ({
  onClose,
  isVisible = false,
}) => {
  // State
  const [input, setInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [activeCommand, setActiveCommand] = useState<Command | null>(null);
  const [commandSubInput, setCommandSubInput] = useState("");
  const [pipelineSuggestions, setPipelineSuggestions] = useState<
    PipelineSuggestion[]
  >([]);
  const [commandMatches, setCommandMatches] = useState<CommandMatch[]>([]);

  // Refs
  const boxRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Reset state when closing
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

  // Memoized handlers
  const executeCommand = useCallback(
    (command: Command, input?: string) => {
      if (!command) return;
      searchService.executeCommand(command, input);
      onClose?.();
    },
    [onClose],
  );

  const enterCommandMode = useCallback((command: Command) => {
    setActiveCommand(command);
    setViewMode("command");
    setCommandSubInput("");
  }, []);

  const handleBackToMain = useCallback(() => {
    setViewMode("main");
    setActiveCommand(null);
    setCommandSubInput("");
  }, []);

  const handlePipelineSelect = useCallback((pipeline: Pipeline) => {
    if (!pipeline) return;

    userPreferencesService
      .addRecentPipeline(pipeline.organization, pipeline.slug)
      .catch((error) => {
        console.error("Failed to add recent pipeline:", error);
      });

    window.location.href = `https://buildkite.com/${pipeline.organization}/${pipeline.slug}`;
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
    },
    [],
  );

  const handleCommandSubInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCommandSubInput(e.target.value);
    },
    [],
  );

  // Enhanced pipeline search function
  const searchPipelines = useCallback(
    async (searchTerm: string, limit: number = 5) => {
      return searchService.searchPipelines(searchTerm, limit);
    },
    [],
  );

  // Update suggestions/commands when input changes in main view
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

  // Update pipeline suggestions in command mode
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

  // Handle command selection
  const handleCommandSelect = useCallback(
    (command: Command) => {
      if (command.id === "pipeline" || command.id === "new-build") {
        enterCommandMode(command);
      } else {
        executeCommand(command, input.split(" ").slice(1).join(" "));
      }
    },
    [enterCommandMode, executeCommand, input],
  );

  // Only render the component when it's visible
  if (!isVisible) return null;

  // Render the appropriate view
  return (
    <div className="cmd-k-wrapper visible">
      <div ref={boxRef} className="cmd-k-box">
        {/* Header with theme toggle */}
        <div
          className="cmd-k-header"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "10px",
          }}
        >
          <ThemeToggle showLabel={false} />
        </div>

        {viewMode === "main" ? (
          <MainMode
            commandMatches={commandMatches}
            pipelineSuggestions={pipelineSuggestions}
            inputValue={input}
            onInputChange={handleInputChange}
            onCommandSelect={handleCommandSelect}
            onPipelineSelect={handlePipelineSelect}
            onClose={onClose || (() => {})}
            resultsContainerRef={resultsRef}
          />
        ) : (
          activeCommand && (
            <CommandMode
              command={activeCommand}
              onBack={handleBackToMain}
              onExecute={executeCommand}
              inputValue={commandSubInput}
              onInputChange={handleCommandSubInputChange}
              pipelineSuggestions={pipelineSuggestions}
              resultsContainerRef={resultsRef}
            />
          )
        )}
      </div>
    </div>
  );
};
