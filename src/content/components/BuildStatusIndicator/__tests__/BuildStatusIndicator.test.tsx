import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BuildStatusIndicator } from "../BuildStatusIndicator";
import {
  pipelineDetailsService,
  BuildStatus,
  BuildInfo,
} from "../../../services/pipelineDetailsService";

// Mock the pipeline details service
jest.mock("../../../services/pipelineDetailsService", () => {
  const originalModule = jest.requireActual(
    "../../../services/pipelineDetailsService",
  );
  return {
    __esModule: true,
    ...originalModule,
    pipelineDetailsService: {
      getLastBuild: jest.fn(),
      getStatusColor: jest.fn(),
      getStatusIcon: jest.fn(),
      formatDuration: jest.fn(),
    },
  };
});

// Mock the error handler hook
jest.mock("../../hooks", () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

describe("BuildStatusIndicator", () => {
  const mockPipeline = {
    id: "test-pipeline",
    name: "Test Pipeline",
    slug: "test-pipeline",
    organization: "test-org",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show loading state initially", () => {
    // Setup
    (pipelineDetailsService.getLastBuild as jest.Mock).mockResolvedValue(null);

    // Render
    render(<BuildStatusIndicator pipeline={mockPipeline} />);

    // Assert
    expect(screen.getByTitle("Loading build status...")).toBeInTheDocument();
    expect(pipelineDetailsService.getLastBuild).toHaveBeenCalledWith(
      mockPipeline,
    );
  });

  it('should display "No builds" when no builds are found', async () => {
    // Setup
    (pipelineDetailsService.getLastBuild as jest.Mock).mockResolvedValue(null);

    // Render
    render(<BuildStatusIndicator pipeline={mockPipeline} showText={true} />);

    // Wait for async operation
    await waitFor(() => {
      expect(screen.getByTitle("No builds found")).toBeInTheDocument();
    });

    expect(screen.getByText("No builds")).toBeInTheDocument();
  });

  it("should display passed status correctly", async () => {
    // Setup
    const mockBuild: BuildInfo = {
      id: "build-123",
      number: 123,
      status: BuildStatus.PASSED,
      duration: 120, // 2 minutes
    };

    (pipelineDetailsService.getLastBuild as jest.Mock).mockResolvedValue(
      mockBuild,
    );
    (pipelineDetailsService.getStatusColor as jest.Mock).mockReturnValue(
      "#10B981",
    );
    (pipelineDetailsService.getStatusIcon as jest.Mock).mockReturnValue(
      "check-circle",
    );
    (pipelineDetailsService.formatDuration as jest.Mock).mockReturnValue(
      "2m 0s",
    );

    // Render
    render(<BuildStatusIndicator pipeline={mockPipeline} showText={true} />);

    // Wait for async operation
    await waitFor(() => {
      expect(screen.getByTitle("Passed in 2m 0s")).toBeInTheDocument();
    });

    // Assert that the build number is displayed
    expect(screen.getByText("#123")).toBeInTheDocument();
  });

  it("should display failed status correctly", async () => {
    // Setup
    const mockBuild: BuildInfo = {
      id: "build-456",
      number: 456,
      status: BuildStatus.FAILED,
      duration: 45, // 45 seconds
    };

    (pipelineDetailsService.getLastBuild as jest.Mock).mockResolvedValue(
      mockBuild,
    );
    (pipelineDetailsService.getStatusColor as jest.Mock).mockReturnValue(
      "#EF4444",
    );
    (pipelineDetailsService.getStatusIcon as jest.Mock).mockReturnValue(
      "x-circle",
    );
    (pipelineDetailsService.formatDuration as jest.Mock).mockReturnValue("45s");

    // Render
    render(<BuildStatusIndicator pipeline={mockPipeline} showText={true} />);

    // Wait for async operation
    await waitFor(() => {
      expect(screen.getByTitle("Failed")).toBeInTheDocument();
    });

    // Assert that the build number is displayed
    expect(screen.getByText("#456")).toBeInTheDocument();
  });

  it("should display running status with spinner", async () => {
    // Setup
    const mockBuild: BuildInfo = {
      id: "build-789",
      number: 789,
      status: BuildStatus.RUNNING,
    };

    (pipelineDetailsService.getLastBuild as jest.Mock).mockResolvedValue(
      mockBuild,
    );
    (pipelineDetailsService.getStatusColor as jest.Mock).mockReturnValue(
      "#3B82F6",
    );
    (pipelineDetailsService.getStatusIcon as jest.Mock).mockReturnValue(
      "loader",
    );

    // Render
    render(<BuildStatusIndicator pipeline={mockPipeline} />);

    // Wait for async operation
    await waitFor(() => {
      expect(screen.getByTitle("Running")).toBeInTheDocument();
    });

    // Assert that the spinner is displayed
    expect(
      document.querySelector(".cmd-k-build-status-spinner"),
    ).toBeInTheDocument();
  });

  it("should respect the size prop", async () => {
    // Setup
    const mockBuild: BuildInfo = {
      id: "build-123",
      number: 123,
      status: BuildStatus.PASSED,
    };

    (pipelineDetailsService.getLastBuild as jest.Mock).mockResolvedValue(
      mockBuild,
    );
    (pipelineDetailsService.getStatusColor as jest.Mock).mockReturnValue(
      "#10B981",
    );
    (pipelineDetailsService.getStatusIcon as jest.Mock).mockReturnValue(
      "check-circle",
    );

    // Render with small size
    const { rerender } = render(
      <BuildStatusIndicator pipeline={mockPipeline} size="small" />,
    );

    // Wait for async operation
    await waitFor(() => {
      expect(
        document.querySelector(".cmd-k-build-status-small"),
      ).toBeInTheDocument();
    });

    // Rerender with large size
    rerender(<BuildStatusIndicator pipeline={mockPipeline} size="large" />);

    // Assert
    expect(
      document.querySelector(".cmd-k-build-status-large"),
    ).toBeInTheDocument();
  });

  it("should handle errors gracefully", async () => {
    // Setup - simulate an error
    const mockError = new Error("Failed to fetch build");
    (pipelineDetailsService.getLastBuild as jest.Mock).mockRejectedValue(
      mockError,
    );

    // Render
    render(<BuildStatusIndicator pipeline={mockPipeline} />);

    // Wait for async operation to fail
    await waitFor(() => {
      // After error, it should show the loading state
      expect(screen.getByTitle("Loading build status...")).toBeInTheDocument();
    });
  });
});
