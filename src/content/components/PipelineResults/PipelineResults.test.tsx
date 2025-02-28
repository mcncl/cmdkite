import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PipelineResults } from "../PipelineResults";
import { Pipeline, PipelineSuggestion } from "../../types";

describe("PipelineResults", () => {
  // Mock data
  const mockPipelines: PipelineSuggestion[] = [
    {
      pipeline: {
        organization: "testorg",
        slug: "frontend-service",
        name: "Frontend Service",
        description: "Frontend application service",
        emoji: "🚀",
      },
      score: 100,
    },
    {
      pipeline: {
        organization: "testorg",
        slug: "backend-api",
        name: "Backend API",
        description: "Core API service",
      },
      score: 80,
    },
  ];

  const mockOnPipelineSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when pipelines array is empty", () => {
    const { container } = render(
      <PipelineResults
        pipelines={[]}
        selectedIndex={0}
        sectionStartIndex={0}
        onPipelineSelect={mockOnPipelineSelect}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders the correct title", () => {
    const customTitle = "Custom Pipeline Title";
    render(
      <PipelineResults
        pipelines={mockPipelines}
        selectedIndex={0}
        sectionStartIndex={0}
        onPipelineSelect={mockOnPipelineSelect}
        title={customTitle}
      />,
    );

    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });

  it("renders all pipeline items", () => {
    render(
      <PipelineResults
        pipelines={mockPipelines}
        selectedIndex={0}
        sectionStartIndex={0}
        onPipelineSelect={mockOnPipelineSelect}
      />,
    );

    expect(screen.getByText("Frontend Service")).toBeInTheDocument();
    expect(screen.getByText("Backend API")).toBeInTheDocument();
    expect(screen.getByText("testorg/frontend-service")).toBeInTheDocument();
    expect(screen.getByText("testorg/backend-api")).toBeInTheDocument();
    expect(
      screen.getByText("Frontend application service"),
    ).toBeInTheDocument();
    expect(screen.getByText("Core API service")).toBeInTheDocument();
  });

  it("renders emoji when present", () => {
    render(
      <PipelineResults
        pipelines={mockPipelines}
        selectedIndex={0}
        sectionStartIndex={0}
        onPipelineSelect={mockOnPipelineSelect}
      />,
    );

    expect(screen.getByText("🚀")).toBeInTheDocument();
  });

  it("applies selected class to the correct item", () => {
    const { container } = render(
      <PipelineResults
        pipelines={mockPipelines}
        selectedIndex={1}
        sectionStartIndex={0}
        onPipelineSelect={mockOnPipelineSelect}
      />,
    );

    const items = container.querySelectorAll(".cmd-k-result");
    expect(items[0]).not.toHaveClass("selected");
    expect(items[1]).toHaveClass("selected");
  });

  it("calls onPipelineSelect with correct pipeline when clicked", () => {
    render(
      <PipelineResults
        pipelines={mockPipelines}
        selectedIndex={0}
        sectionStartIndex={0}
        onPipelineSelect={mockOnPipelineSelect}
      />,
    );

    fireEvent.click(screen.getByText("Backend API"));

    expect(mockOnPipelineSelect).toHaveBeenCalledTimes(1);
    expect(mockOnPipelineSelect).toHaveBeenCalledWith(
      mockPipelines[1].pipeline,
    );
  });

  it("uses custom sectionId", () => {
    const customSectionId = "custom-pipelines-section";
    render(
      <PipelineResults
        pipelines={mockPipelines}
        selectedIndex={0}
        sectionStartIndex={0}
        onPipelineSelect={mockOnPipelineSelect}
        sectionId={customSectionId}
      />,
    );

    const sectionTitle = screen.getByText("Pipelines");
    expect(sectionTitle).toHaveAttribute("id", customSectionId);
  });

  it("handles sectionStartIndex correctly for selection", () => {
    const { container } = render(
      <PipelineResults
        pipelines={mockPipelines}
        selectedIndex={5} // With start index 4, second item should be selected
        sectionStartIndex={4}
        onPipelineSelect={mockOnPipelineSelect}
      />,
    );

    const items = container.querySelectorAll(".cmd-k-result");
    expect(items[0]).not.toHaveClass("selected");
    expect(items[1]).toHaveClass("selected");
  });

  it("sets correct ARIA attributes", () => {
    render(
      <PipelineResults
        pipelines={mockPipelines}
        selectedIndex={0}
        sectionStartIndex={0}
        onPipelineSelect={mockOnPipelineSelect}
        sectionId="test-section"
      />,
    );

    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveAttribute("aria-labelledby", "test-section");

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
  });
});
