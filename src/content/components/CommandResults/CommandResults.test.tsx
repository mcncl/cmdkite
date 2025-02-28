import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandResults } from "./CommandResults";
import { Command, CommandMatch } from "../../types";

describe("CommandResults", () => {
  // Mock data
  const mockCommands: CommandMatch[] = [
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
        description: "Navigate to create a new build for a pipeline",
        keywords: ["build", "run", "start", "deploy", "trigger"],
        execute: jest.fn(),
      },
      score: 80,
    },
  ];

  const mockOnCommandSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when commands array is empty", () => {
    const { container } = render(
      <CommandResults
        commands={[]}
        selectedIndex={0}
        sectionStartIndex={0}
        onCommandSelect={mockOnCommandSelect}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders all command items", () => {
    render(
      <CommandResults
        commands={mockCommands}
        selectedIndex={0}
        sectionStartIndex={0}
        onCommandSelect={mockOnCommandSelect}
      />,
    );

    expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Create New Build")).toBeInTheDocument();
    expect(screen.getByText("/pipeline")).toBeInTheDocument();
    expect(screen.getByText("/new-build")).toBeInTheDocument();
    expect(
      screen.getByText("Navigate to a specific pipeline"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Navigate to create a new build for a pipeline"),
    ).toBeInTheDocument();
  });

  it("applies selected class to the correct item", () => {
    const { container } = render(
      <CommandResults
        commands={mockCommands}
        selectedIndex={1}
        sectionStartIndex={0}
        onCommandSelect={mockOnCommandSelect}
      />,
    );

    const items = container.querySelectorAll(".cmd-k-command");
    expect(items[0]).not.toHaveClass("selected");
    expect(items[1]).toHaveClass("selected");
  });

  it("calls onCommandSelect with correct command when clicked", () => {
    render(
      <CommandResults
        commands={mockCommands}
        selectedIndex={0}
        sectionStartIndex={0}
        onCommandSelect={mockOnCommandSelect}
      />,
    );

    fireEvent.click(screen.getByText("Create New Build"));

    expect(mockOnCommandSelect).toHaveBeenCalledTimes(1);
    expect(mockOnCommandSelect).toHaveBeenCalledWith(mockCommands[1].command);
  });

  it("handles sectionStartIndex correctly for selection", () => {
    const { container } = render(
      <CommandResults
        commands={mockCommands}
        selectedIndex={6} // With start index 5, second item should be selected
        sectionStartIndex={5}
        onCommandSelect={mockOnCommandSelect}
      />,
    );

    const items = container.querySelectorAll(".cmd-k-command");
    expect(items[0]).not.toHaveClass("selected");
    expect(items[1]).toHaveClass("selected");
  });

  it("sets correct ARIA attributes", () => {
    render(
      <CommandResults
        commands={mockCommands}
        selectedIndex={0}
        sectionStartIndex={0}
        onCommandSelect={mockOnCommandSelect}
      />,
    );

    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveAttribute("aria-labelledby", "commands-section");

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
  });

  it("displays command header with name and ID", () => {
    render(
      <CommandResults
        commands={mockCommands}
        selectedIndex={0}
        sectionStartIndex={0}
        onCommandSelect={mockOnCommandSelect}
      />,
    );

    const commandHeaders = screen.getAllByText("Go to Pipeline", {
      exact: false,
    });
    expect(commandHeaders.length).toBeGreaterThan(0);

    const commandIds = screen.getAllByText("/pipeline", { exact: false });
    expect(commandIds.length).toBeGreaterThan(0);
  });

  it("handles tabbing for accessibility", () => {
    render(
      <CommandResults
        commands={mockCommands}
        selectedIndex={0}
        sectionStartIndex={0}
        onCommandSelect={mockOnCommandSelect}
      />,
    );

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("tabIndex", "0");
    expect(options[1]).toHaveAttribute("tabIndex", "-1");
  });
});
