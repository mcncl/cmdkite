import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandMode } from "../CommandMode";
import { Command, PipelineSuggestion } from "../../types";

// Mock the useKeyboardNavigation hook
jest.mock("../../hook", () => ({
  useKeyboardNavigation: jest.fn(() => ({
    selectedIndex: 0,
    selectedItem: null,
    selectedSectionId: null,
    getTotalItems: jest.fn().mockReturnValue(2),
    handleKeyDown: jest.fn().mockReturnValue(true),
    setSelectedIndex: jest.fn(),
    resetSelection: jest.fn(),
    getSectionStartIndex: jest.fn().mockReturnValue(0),
  })),
}));

// Mock child components
jest.mock("../CommandInput", () => ({
  CommandInput: ({ value, onChange, onKeyDown, placeholder, className }) => (
    <input
      data-testid="command-input"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
    />
  ),
}));

jest.mock("../PipelineResults", () => ({
  PipelineResults: ({ pipelines, selectedIndex, onPipelineSelect, title }) => (
    <div data-testid="pipeline-results">
      <div data-testid="pipelines-count">{pipelines.length}</div>
      <div data-testid="results-title">{title || "Pipelines"}</div>
      <button
        data-testid="pipeline-select-button"
        onClick={() => onPipelineSelect(pipelines[0].pipeline)}
      >
        Select Pipeline
      </button>
    </div>
  ),
}));

describe("CommandMode", () => {
  // Mock data
  const mockCommand: Command = {
    id: "pipeline",
    name: "Go to Pipeline",
    description: "Navigate to a specific pipeline",
    keywords: ["pipeline", "goto"],
    execute: jest.fn(),
  };

  const mockBuildCommand: Command = {
    id: "new-build",
    name: "Create New Build",
    description: "Create a new build for a pipeline",
    keywords: ["build", "deploy"],
    execute: jest.fn(),
  };

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
    command: mockCommand,
    onBack: jest.fn(),
    onExecute: jest.fn(),
    inputValue: "test",
    onInputChange: jest.fn(),
    pipelineSuggestions: mockPipelineSuggestions,
    resultsContainerRef: { current: null } as React.RefObject<HTMLDivElement>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders header with command name", () => {
    render(<CommandMode {...mockProps} />);

    const commandName = screen.getByText("Go to Pipeline");
    expect(commandName).toBeInTheDocument();
  });

  it("renders back button", () => {
    render(<CommandMode {...mockProps} />);

    const backButton = screen.getByText("← Back");
    expect(backButton).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    render(<CommandMode {...mockProps} />);

    const backButton = screen.getByText("← Back");
    fireEvent.click(backButton);

    expect(mockProps.onBack).toHaveBeenCalledTimes(1);
  });

  it("renders CommandInput with correct placeholder for pipeline command", () => {
    render(<CommandMode {...mockProps} />);

    const input = screen.getByTestId("command-input");
    expect(input).toHaveAttribute("placeholder", "Search pipelines...");
  });

  it("renders CommandInput with correct placeholder for new-build command", () => {
    render(<CommandMode {...mockProps} command={mockBuildCommand} />);

    const input = screen.getByTestId("command-input");
    expect(input).toHaveAttribute(
      "placeholder",
      "Search pipelines to create a build...",
    );
  });

  it("renders CommandInput with correct placeholder for other commands", () => {
    const otherCommand: Command = {
      id: "other-command",
      name: "Other Command",
      description: "Some other command",
      keywords: ["other"],
      execute: jest.fn(),
    };

    render(<CommandMode {...mockProps} command={otherCommand} />);

    const input = screen.getByTestId("command-input");
    expect(input).toHaveAttribute("placeholder", "Enter parameters...");
  });

  it("renders PipelineResults when suggestions exist", () => {
    render(<CommandMode {...mockProps} />);

    const pipelineResults = screen.getByTestId("pipeline-results");
    expect(pipelineResults).toBeInTheDocument();

    const pipelinesCount = screen.getByTestId("pipelines-count");
    expect(pipelinesCount).toHaveTextContent("2");
  });

  it("does not render PipelineResults when no suggestions exist", () => {
    render(<CommandMode {...mockProps} pipelineSuggestions={[]} />);

    expect(screen.queryByTestId("pipeline-results")).not.toBeInTheDocument();
  });

  it("displays empty state when input is not empty and no suggestions exist", () => {
    render(
      <CommandMode
        {...mockProps}
        pipelineSuggestions={[]}
        inputValue="nonexistent"
      />,
    );

    expect(screen.getByText("No matching pipelines found")).toBeInTheDocument();
  });

  it("does not display empty state when input is empty", () => {
    render(
      <CommandMode {...mockProps} pipelineSuggestions={[]} inputValue="" />,
    );

    expect(
      screen.queryByText("No matching pipelines found"),
    ).not.toBeInTheDocument();
  });
});
