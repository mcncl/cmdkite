import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandInput } from "./CommandInput";

describe("CommandInput", () => {
  const mockOnChange = jest.fn();
  const mockOnKeyDown = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with default placeholder", () => {
    render(
      <CommandInput
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
      />,
    );

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute(
      "placeholder",
      "Search commands and pipelines...",
    );
  });

  it("renders with custom placeholder", () => {
    const customPlaceholder = "Custom placeholder text";
    render(
      <CommandInput
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        placeholder={customPlaceholder}
      />,
    );

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("placeholder", customPlaceholder);
  });

  it("applies custom className", () => {
    const customClass = "custom-input-class";
    render(
      <CommandInput
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        className={customClass}
      />,
    );

    const input = screen.getByRole("searchbox");
    expect(input).toHaveClass(customClass);
  });

  it("calls onChange handler when input changes", () => {
    render(
      <CommandInput
        value="test"
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
      />,
    );

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "new value" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it("calls onKeyDown handler when key is pressed", () => {
    render(
      <CommandInput
        value="test"
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
      />,
    );

    const input = screen.getByRole("searchbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnKeyDown).toHaveBeenCalledTimes(1);
  });

  it("displays the correct value", () => {
    const testValue = "test value";
    render(
      <CommandInput
        value={testValue}
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
      />,
    );

    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue(testValue);
  });

  it("autofocuses by default", () => {
    render(
      <CommandInput
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
      />,
    );

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("autofocus");
  });

  it("respects autoFocus prop when set to false", () => {
    render(
      <CommandInput
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        autoFocus={false}
      />,
    );

    const input = screen.getByRole("searchbox");
    expect(input).not.toHaveAttribute("autofocus");
  });
});
