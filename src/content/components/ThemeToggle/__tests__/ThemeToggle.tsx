import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";
import { useTheme } from "../../ThemeProvider/ThemeProvider";

// Mock the useTheme hook
jest.mock("../../ThemeProvider/ThemeProvider", () => ({
  useTheme: jest.fn(),
}));

describe("ThemeToggle", () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    (useTheme as jest.Mock).mockReturnValue({
      theme: "system",
      themeMode: "light",
      setTheme: mockSetTheme,
      toggleTheme: jest.fn(),
    });
  });

  it("renders with correct defaults", () => {
    render(<ThemeToggle />);

    // Select should be present
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("system");

    // Icon should be present
    expect(
      screen.getByRole("combobox").parentElement?.querySelector("svg"),
    ).toBeInTheDocument();

    // Label should not be visible by default
    expect(screen.queryByText("System")).not.toBeInTheDocument();
  });

  it("renders with label when showLabel is true", () => {
    render(<ThemeToggle showLabel={true} />);

    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<ThemeToggle className="custom-class" />);

    const container = screen
      .getByRole("combobox")
      .closest(".cmd-k-theme-toggle");
    expect(container).toHaveClass("custom-class");
  });

  it("renders light theme icon when themeMode is light", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      themeMode: "light",
      setTheme: mockSetTheme,
      toggleTheme: jest.fn(),
    });

    render(<ThemeToggle showLabel={true} />);

    expect(screen.getByText("Light")).toBeInTheDocument();

    // Check for the presence of the light icon (SVG with circle and lines)
    const svg = screen
      .getByRole("combobox")
      .parentElement?.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector("circle")).toBeInTheDocument();
  });

  it("renders dark theme icon when themeMode is dark", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "dark",
      themeMode: "dark",
      setTheme: mockSetTheme,
      toggleTheme: jest.fn(),
    });

    render(<ThemeToggle showLabel={true} />);

    expect(screen.getByText("Dark")).toBeInTheDocument();

    // Check for the presence of the dark icon (SVG with moon path)
    const svg = screen
      .getByRole("combobox")
      .parentElement?.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector("path")).toBeInTheDocument();
  });

  it("calls setTheme when select value changes", () => {
    render(<ThemeToggle />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "dark" } });

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("shows system preference in label when using system theme", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "system",
      themeMode: "dark", // System preference is dark
      setTheme: mockSetTheme,
      toggleTheme: jest.fn(),
    });

    render(<ThemeToggle showLabel={true} />);

    expect(screen.getByText("System")).toBeInTheDocument();

    // Even though we're showing "System" in the label, the icon should match the dark theme
    const svg = screen
      .getByRole("combobox")
      .parentElement?.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector("path")).toBeInTheDocument(); // Dark mode icon has a path
  });
});
