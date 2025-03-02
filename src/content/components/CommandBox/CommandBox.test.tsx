import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandBox } from "../CommandBox";
import { searchService } from "../../services/searchService";
import { userPreferencesService } from "../../services/preferences";

// Mock the keyboard navigation hook
jest.mock("../../../hooks/useKeyboardNavigation", () => ({
  useKeyboardNavigation: () => ({
    selectedIndex: 0,
    selectedItem: null,
    selectedSectionId: null,
    getTotalItems: jest.fn().mockReturnValue(2),
    handleKeyDown: jest.fn().mockImplementation((e) => {
      // Mock some basic keyboard navigation
      if (e.key === "Escape") return true;
      if (e.key === "ArrowDown") return true;
      if (e.key === "ArrowUp") return true;
      if (e.key === "Enter") return true;
      return false;
    }),
    setSelectedIndex: jest.fn(),
    resetSelection: jest.fn(),
    getSectionStartIndex: jest.fn().mockReturnValue(0),
  }),
}));

// Mock the search service
jest.mock("../../../services/searchService", () => ({
  searchService: {
    searchCommands: jest.fn().mockReturnValue([
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
    ]),
    searchPipelines: jest.fn().mockResolvedValue([
      {
        pipeline: {
          organization: "testorg",
          slug: "frontend-service",
          name: "Frontend Service",
          description: "Frontend application service",
        },
        score: 90,
      },
    ]),
    executeCommand: jest.fn(),
    getRecentPipelines: jest.fn().mockResolvedValue([]),
  },
}));

// Mock user preferences service
jest.mock("../../../services/preferences", () => ({
  userPreferencesService: {
    addRecentPipeline: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock window.location
const originalLocation = window.location;
beforeAll(() => {
  // @ts-ignore
  delete window.location;
  window.location = {
    ...originalLocation,
    href: "https://buildkite.com/testorg/test-pipeline",
  };
});

afterAll(() => {
  window.location = originalLocation;
});

describe("CommandBox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not render when not visible", () => {
    const { container } = render(<CommandBox isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render main mode by default when visible", () => {
    render(<CommandBox isVisible={true} />);

    // Check that the input is rendered
    const input = screen.getByPlaceholderText(
      "Search commands and pipelines...",
    );
    expect(input).toBeInTheDocument();
  });

  it("should fetch commands when input changes", async () => {
    render(<CommandBox isVisible={true} />);

    const input = screen.getByPlaceholderText(
      "Search commands and pipelines...",
    );
    fireEvent.change(input, { target: { value: "pipe" } });

    // Wait for search to be triggered
    await waitFor(() => {
      expect(searchService.searchCommands).toHaveBeenCalledWith("pipe");
      expect(searchService.searchPipelines).toHaveBeenCalledWith("pipe", 5);
    });
  });

  it("should display command results", async () => {
    render(<CommandBox isVisible={true} />);

    // Wait for command results to be displayed
    await waitFor(() => {
      expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
      expect(screen.getByText("Create New Build")).toBeInTheDocument();
    });
  });

  it("should display pipeline results", async () => {
    render(<CommandBox isVisible={true} />);

    // Wait for pipeline results to be displayed
    await waitFor(() => {
      expect(screen.getByText("Frontend Service")).toBeInTheDocument();
      expect(screen.getByText("testorg/frontend-service")).toBeInTheDocument();
    });
  });

  it("should switch to command mode when pipeline command is selected", async () => {
    render(<CommandBox isVisible={true} />);

    // Wait for command results to be displayed
    await waitFor(() => {
      expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    });

    // Click on the pipeline command
    fireEvent.click(screen.getByText("Go to Pipeline"));

    // Check that we're in command mode
    expect(
      screen.getByPlaceholderText("Search pipelines..."),
    ).toBeInTheDocument();
    expect(screen.getByText("← Back")).toBeInTheDocument();
  });

  it("should return to main mode when back button is clicked", async () => {
    render(<CommandBox isVisible={true} />);

    // First go to command mode
    await waitFor(() => {
      expect(screen.getByText("Go to Pipeline")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Go to Pipeline"));

    // Now click the back button
    fireEvent.click(screen.getByText("← Back"));

    // We should be back in main mode
    expect(
      screen.getByPlaceholderText("Search commands and pipelines..."),
    ).toBeInTheDocument();
  });

  it("should execute a command when non-pipeline command is selected", async () => {
    render(<CommandBox isVisible={true} />);

    // Wait for command results
    await waitFor(() => {
      expect(screen.getByText("Create New Build")).toBeInTheDocument();
    });

    // Click on a non-pipeline command
    fireEvent.click(screen.getByText("Create New Build"));

    // The command should be executed
    expect(searchService.executeCommand).toHaveBeenCalled();
  });

  it("should navigate to a pipeline when selected", async () => {
    render(<CommandBox isVisible={true} />);

    // Wait for pipeline results
    await waitFor(() => {
      expect(screen.getByText("Frontend Service")).toBeInTheDocument();
    });

    // Click on a pipeline
    fireEvent.click(screen.getByText("Frontend Service"));

    // Should record the pipeline visit
    expect(userPreferencesService.addRecentPipeline).toHaveBeenCalledWith(
      "testorg",
      "frontend-service",
    );

    // Should navigate to the pipeline
    expect(window.location.href).toBe(
      "https://buildkite.com/testorg/frontend-service",
    );
  });

  it("should close when escape key is pressed", async () => {
    const onClose = jest.fn();
    render(<CommandBox isVisible={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText(
      "Search commands and pipelines...",
    );
    fireEvent.keyDown(input, { key: "Escape" });

    // Wait for the event to be processed
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("should handle click outside to close", () => {
    const onClose = jest.fn();
    render(<CommandBox isVisible={true} onClose={onClose} />);

    // Simulate a click outside
    fireEvent.mouseDown(document);

    expect(onClose).toHaveBeenCalled();
  });

  it("should show empty state when no results found", async () => {
    // Override the mock for this test
    jest.spyOn(searchService, "searchCommands").mockReturnValueOnce([]);
    jest.spyOn(searchService, "searchPipelines").mockResolvedValueOnce([]);

    render(<CommandBox isVisible={true} />);

    const input = screen.getByPlaceholderText(
      "Search commands and pipelines...",
    );
    fireEvent.change(input, { target: { value: "nonexistent" } });

    // Wait for the empty state to appear
    await waitFor(() => {
      expect(screen.getByText("No matching results found")).toBeInTheDocument();
    });
  });
});
