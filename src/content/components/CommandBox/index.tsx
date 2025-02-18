import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Pipeline, PipelineSuggestion } from "../../types";

interface CommandBoxProps {
  onClose?: () => void;
  isVisible?: boolean;
}

export const CommandBox: React.FC<CommandBoxProps> = ({
  onClose,
  isVisible = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<PipelineSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  // Focus input when becoming visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Clear input when closing
  useEffect(() => {
    if (!isVisible) {
      setInput("");
      setSuggestions([]);
      setSelectedIndex(0);
    }
  }, [isVisible]);

  // Fetch pipelines from the page
  const fetchPipelines = useCallback(async () => {
    const elements = Array.from(
      document.querySelectorAll('[data-testid="pipeline"]'),
    );

    const pipelineData = elements
      .map((element): Pipeline | null => {
        const linkContainer = element.querySelector(".flex-auto a");
        if (!linkContainer) return null;

        const href = linkContainer.getAttribute("href");
        if (!href) return null;

        const parts = href.replace("https://buildkite.com/", "").split("/");
        const organization = parts[0];
        const slug = parts[1];

        const nameElement = linkContainer.querySelector("h2 span[title]");
        const name = nameElement?.getAttribute("title") || slug;

        const descriptionElement = linkContainer.querySelector(
          ".text-sm.regular[title]",
        );
        const description = descriptionElement?.getAttribute("title") || "";

        const emojiElement = element.querySelector(
          '[data-testid="emoji-avatar-base"] .leading-none',
        );
        const emoji = emojiElement?.getAttribute("title")?.trim();

        const metrics: Record<string, string> = {};
        const metricElements = element.querySelectorAll(
          ".flex-column .truncate",
        );
        metricElements.forEach((metricContainer) => {
          const label = metricContainer
            .querySelector(".dark-gray")
            ?.textContent?.trim();
          const value = metricContainer
            .querySelector(".text-2xl")
            ?.textContent?.trim();
          if (label && value) {
            metrics[label.toLowerCase()] = value;
          }
        });

        return {
          organization,
          slug,
          name,
          description,
          ...(emoji && { emoji }),
          ...(metrics.reliability && { reliability: metrics.reliability }),
          ...(metrics.speed && { speed: metrics.speed }),
        };
      })
      .filter((p): p is Pipeline => p !== null);

    setPipelines(pipelineData);
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  // Fuzzy search function
  const fuzzyMatch = useCallback((text: string, search: string): number => {
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
  }, []);

  // Update suggestions when input changes
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }

    const searchTerm = input.toLowerCase();
    const matches = pipelines
      .map((pipeline) => {
        const nameScore = fuzzyMatch(pipeline.name, searchTerm) * 1.5;
        const slugScore = fuzzyMatch(pipeline.slug, searchTerm);
        const fullPathScore = fuzzyMatch(
          `${pipeline.organization}/${pipeline.slug}`,
          searchTerm,
        );

        return {
          pipeline,
          score: Math.max(nameScore, slugScore, fullPathScore),
        };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setSuggestions(matches);
    setSelectedIndex(0);
  }, [input, pipelines, fuzzyMatch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && selectedIndex >= 0) {
        const { organization, slug } = suggestions[selectedIndex].pipeline;
        window.location.href = `/${organization}/${slug}`;
      }
    }
  };

  // Handle click outside to close
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
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

  // Only render the component when it's visible
  if (!isVisible) return null;

  return (
    <div className="cmd-k-wrapper visible">
      <div ref={boxRef} className="cmd-k-box">
        {/* Input field */}
        <input
          ref={inputRef}
          className="cmd-k-input"
          placeholder="Search pipelines..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Results list */}
        {suggestions.length > 0 && (
          <div className="cmd-k-results">
            {suggestions.map(({ pipeline }, index) => (
              <div
                key={`${pipeline.organization}/${pipeline.slug}`}
                className={`cmd-k-result ${
                  index === selectedIndex ? "selected" : ""
                }`}
                onClick={() => {
                  window.location.href = `/${pipeline.organization}/${pipeline.slug}`;
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

                  <div style={{ display: "flex", gap: "12px" }}>
                    {pipeline.speed && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          Speed
                        </div>
                        <div style={{ fontWeight: 500 }}>{pipeline.speed}</div>
                      </div>
                    )}
                    {pipeline.reliability && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          Reliability
                        </div>
                        <div style={{ fontWeight: 500 }}>
                          {pipeline.reliability}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {input && !suggestions.length && (
          <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>
            No matching pipelines found
          </div>
        )}
      </div>
    </div>
  );
};
