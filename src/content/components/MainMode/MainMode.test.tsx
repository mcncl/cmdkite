import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MainMode } from "../MainMode";
import {
  Command,
  Pipeline,
  CommandMatch,
  PipelineSuggestion,
} from "../../types";

// Mock the useKeyboardNavigation hook
jest.mock("../../hooks/useKeyboardNavigation", () => ({
  useKeyboardNavigation: jest.fn(() => ({
    selectedIndex: 0,
    selectedItem: null,
    selectedSectionId: null,
    getTotalItems: jest.fn().mockReturnValue(4),
    handleKeyDown: jest.fn().mockReturnValue(true),
    setSelectedIndex: jest.fn(),
    resetSelection: jest.fn(),
    getSectionStartIndex: jest.fn().mockReturnValue(0),
  })),
}));

// Mock child components
jest.mock("../CommandInput", () => ({
  CommandInput: ({ value, onChange, onKeyDown }) => (
    <input
      data-testid="command-input"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  ),
}));

jest.mock("../CommandResults", () => ({
  CommandResults: ({ commands, selectedIndex, onCommandSelect }) => (
    <div data-testid="command-results">
      <div data-testid="commands-count">{commands.length}</div>
      <button
        data-testid="command-select-button"
        onClick={() => onCommandSelect(commands[0].command)}
      >
        Select Command
      </button>
    </div>
  ),
}));

jest.mock("../PipelineResults", () => ({
  PipelineResults: ({ pipelines, selectedIndex, onPipelineSelect }) => (
    <div data-testid="pipeline-results">
      <div data-testid="pipelines-count">{pipelines.length}</div>
      <button
        data-testid="pipeline-select-button"
        onClick={() => onPipelineSelect(pipelines[0].pipeline)}
      >
        Select Pipeline
      </button>
    </div>
  ),
}));

describe("MainMode", () => {
  // Mock data
  const mockCommandMatches: CommandMatch[] = [
    {
      command: {
        id: "pipeline",
        name: "Go to Pipeline",
        description: "Navigate to a specific pipeline",
        keywords: ["pipeline", "goto"],
        execute: jest.fn(),
      },
      score: 100,
    },
    {
      command: {
        id: "new-build",
        name: "Create New Build",
        description: "Create a new build for a pipeline",
        keywords: ["build", "deploy"],
        execute: jest.fn(),
      },
      score: 80,
    },
  ];

  const mockPipelineSuggestions: PipelineSuggestion[] = [
    {
      pipeline: {
        organization: "testorg",
        slug: "frontend-service",
        name: "Frontend Service",
        description: "Frontend application service",
      },
      score: 90,
    },
    {
      pipeline: {
        organization: "testorg",
        slug: "backend-api",
        name: "Backend API",
        description: "Core API service",
      },
      score: 75,
    },
  ];

  const mockProps = {
    commandMatches: mockCommandMatches,
    pipelineSuggestions: mockPipelineSuggestions,
    inputValue: "test",
    onInputChange: jest.fn(),
    onCommandSelect: jest.fn(),
    onPipelineSelect: jest.fn(),
    onClose: jest.fn(),
    resultsContainerRef: { current: null } as React.RefObject<HTMLDivElement>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders CommandInput with correct props", () => {
    render(<MainMode {...mockProps} />);

    const input = screen.getByTestId("command-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("test");
  });

  it("renders CommandResults with correct props", () => {
    render(<MainMode {...mockProps} />);

    const commandResults = screen.getByTestId("command-results");
    expect(commandResults).toBeInTheDocument();

    const commandsCount = screen.getByTestId("commands-count");
    expect(commandsCount).toHaveTextContent("2");
  });

  it("renders PipelineResults with correct props", () => {
    render(<MainMode {...mockProps} />);

    const pipelineResults = screen.getByTestId("pipeline-results");
    expect(pipelineResults).toBeInTheDocument();

    const pipelinesCount = screen.getByTestId("pipelines-count");
    expect(pipelinesCount).toHaveTextContent("2");
  });

  it("displays empty state when no results are found", () => {
    render(
      <MainMode
        {...mockProps}
        commandMatches={[]}
        pipelineSuggestions={[]}
        inputValue="nonexistent"
      />,
    );

    expect(screen.getByText("No matching results found")).toBeInTheDocument();
  });

  it("does not display empty state when input is empty", () => {
    render(
      <MainMode
        {...mockProps}
        commandMatches={[]}
        pipelineSuggestions={[]}
        inputValue=""
      />,
    );

    expect(
      screen.queryByText("No matching results found"),
    ).not.toBeInTheDocument();
  });

  it("calls onCommandSelect when a command is selected", () => {
    render(<MainMode {...mockProps} />);

    const selectButton = screen.getByTestId("command-select-button");
    fireEvent.click(selectButton);

    expect(mockProps.onCommandSelect).toHaveBeenCalledTimes(1);
    expect(mockProps.onCommandSelect).toHaveBeenCalledWith(
      mockCommandMatches[0].command,
    );
  });

  it("calls onPipelineSelect when a pipeline is selected", () => {
    render(<MainMode {...mockProps} />);

    const selectButton = screen.getByTestId("pipeline-select-button");
    fireEvent.click(selectButton);

    expect(mockProps.onPipelineSelect).toHaveBeenCalledTimes(1);
    expect(mockProps.onPipelineSelect).toHaveBeenCalledWith(
      mockPipelineSuggestions[0].pipeline,
    );
  });

  it("calls onInputChange when input changes", () => {
    render(<MainMode {...mockProps} />);

    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "new value" } });

    expect(mockProps.onInputChange).toHaveBeenCalledTimes(1);
  });

  it("renders the results container with ref", () => {
    // Create a real ref to test with
    const ref = React.createRef<HTMLDivElement>();

    render(<MainMode {...mockProps} resultsContainerRef={ref} />);

    const resultsContainer =
      screen.getByTestId("pipeline-results").parentElement;
    expect(resultsContainer).toHaveClass("cmd-k-results");
  });
});
