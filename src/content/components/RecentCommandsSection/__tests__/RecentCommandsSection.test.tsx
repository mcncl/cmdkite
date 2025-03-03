import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecentCommandsSection } from "../RecentCommandsSection";
import { userPreferencesService } from "../../../services/preferences";
import { commandRegistry } from "../../../services/commandRegistry";
import { Command } from "../../../types";

// Mock the hooks
jest.mock("../../hooks", () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

// Mock the services
jest.mock("../../services/preferences", () => ({
  userPreferencesService: {
    getRecentCommands: jest.fn(),
    isFavoriteCommand: jest.fn(),
    toggleFavoriteCommand: jest.fn(),
  },
}));

jest.mock("../../services/commandRegistry", () => ({
  commandRegistry: {
    getCommand: jest.fn(),
  },
}));

describe("RecentCommandsSection", () => {
  // Sample test data
  const testCommands: Command[] = [
    {
      id: "pipeline",
      name: "Go to Pipeline",
      description: "Navigate to a specific pipeline",
      keywords: ["pipeline", "goto"],
      execute: jest.fn(),
    },
    {
      id: "new-build",
      name: "Create New Build",
      description: "Create a new build for a pipeline",
      keywords: ["build", "deploy"],
      execute: jest.fn(),
    },
    {
      id: "list-pipelines",
      name: "View all Pipelines",
      description: "View all pipelines for the current organization",
      keywords: ["list", "view", "show", "pipelines"],
      execute: jest.fn(),
    },
  ];

  const mockOnCommandSelect = jest.fn();
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (userPreferencesService.getRecentCommands as jest.Mock).mockResolvedValue([
      { commandId: "pipeline", lastUsed: Date.now(), useCount: 5 },
      { commandId: "new-build", lastUsed: Date.now() - 1000, useCount: 3 },
      { commandId: "list-pipelines", lastUsed: Date.now() - 2000, useCount: 1 },
    ]);

    (commandRegistry.getCommand as jest.Mock).mockImplementation((id) => {
      return testCommands.find((cmd) => cmd.id === id);
    });

    (userPreferencesService.isFavoriteCommand as jest.Mock).mockImplementation(
      (id) => {
        // Mock pipeline as favorite, others as not
        return Promise.resolve(id === "pipeline");
      },
    );
  });

  it("renders loading state initially", () => {
    render(
      <RecentCommandsSection
        selectedIndex={0}
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    expect(screen.getByText("Loading recent commands...")).toBeInTheDocument();
  });

  it("renders recent commands after loading", async () => {
    render(
      <RecentCommandsSection
        selectedIndex={0}
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Wait for commands to load
    await waitFor(() => {
      expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    });

    // Should show all three commands
    expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Create New Build")).toBeInTheDocument();
    expect(screen.getByText("View all Pipelines")).toBeInTheDocument();
  });

  it("shows usage count for frequently used commands", async () => {
    render(
      <RecentCommandsSection
        selectedIndex={0}
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Wait for commands to load
    await waitFor(() => {
      expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    });

    // Should show usage count for commands used more than once
    expect(screen.getByText("(5×)")).toBeInTheDocument();
    expect(screen.getByText("(3×)")).toBeInTheDocument();
    // Should not show count for commands used only once
    expect(screen.queryByText("(1×)")).not.toBeInTheDocument();
  });

  it("correctly shows favorite status", async () => {
    render(
      <RecentCommandsSection
        selectedIndex={0}
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Wait for commands to load
    await waitFor(() => {
      expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    });

    // Find all star icons (one per command)
    const favoriteIcons = document.querySelectorAll(".cmd-k-favorite-icon");

    // First one (pipeline) should be active
    expect(favoriteIcons[0]).toHaveClass("active");

    // Others should not be active
    expect(favoriteIcons[1]).not.toHaveClass("active");
    expect(favoriteIcons[2]).not.toHaveClass("active");
  });

  it("calls onCommandSelect when a command is clicked", async () => {
    render(
      <RecentCommandsSection
        selectedIndex={0}
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Wait for commands to load
    await waitFor(() => {
      expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    });

    // Click the second command
    fireEvent.click(screen.getByText("Create New Build"));

    expect(mockOnCommandSelect).toHaveBeenCalledWith(testCommands[1]);
  });

  it("calls toggleFavoriteCommand when favorite icon is clicked", async () => {
    render(
      <RecentCommandsSection
        selectedIndex={0}
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Wait for commands to load
    await waitFor(() => {
      expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    });

    // Find all favorite buttons
    const favoriteButtons = document.querySelectorAll(".cmd-k-favorite");

    // Click the second one (for new-build command)
    fireEvent.click(favoriteButtons[1]);

    expect(userPreferencesService.toggleFavoriteCommand).toHaveBeenCalledWith(
      "new-build",
    );
  });

  it("applies selected class to the correct item", async () => {
    render(
      <RecentCommandsSection
        selectedIndex={2} // Select third item (index 2)
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Wait for commands to load
    await waitFor(() => {
      expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    });

    // Get all command elements
    const commandElements = document.querySelectorAll(".cmd-k-command");

    // Check that only the third element has the selected class
    expect(commandElements[0]).not.toHaveClass("selected");
    expect(commandElements[1]).not.toHaveClass("selected");
    expect(commandElements[2]).toHaveClass("selected");
  });

  it("does not render at all if there are no recent commands", async () => {
    // Mock empty recent commands
    (userPreferencesService.getRecentCommands as jest.Mock).mockResolvedValue(
      [],
    );

    const { container } = render(
      <RecentCommandsSection
        selectedIndex={0}
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText("Loading recent commands..."),
      ).not.toBeInTheDocument();
    });

    // Component should not render anything
    expect(container.firstChild).toBeNull();
  });

  it("calls onSelectionChange with the correct count", async () => {
    render(
      <RecentCommandsSection
        selectedIndex={0}
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Wait for commands to load
    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenCalledWith(3);
    });
  });

  it("handles errors gracefully", async () => {
    // Mock error response
    (userPreferencesService.getRecentCommands as jest.Mock).mockRejectedValue(
      new Error("Test error"),
    );

    render(
      <RecentCommandsSection
        selectedIndex={0}
        startIndex={0}
        onCommandSelect={mockOnCommandSelect}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Should call onSelectionChange with 0 when there's an error
    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenCalledWith(0);
    });
  });
});
