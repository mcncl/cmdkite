import { renderHook, act } from "@testing-library/react";
import { useKeyboardNavigation } from "../useKeyboardNavigation";
import { createRef } from "react";

// Mock data for tests
type TestItem = {
  id: string;
  name: string;
};

const sectionA: TestItem[] = [
  { id: "a1", name: "Item A1" },
  { id: "a2", name: "Item A2" },
  { id: "a3", name: "Item A3" },
];

const sectionB: TestItem[] = [
  { id: "b1", name: "Item B1" },
  { id: "b2", name: "Item B2" },
];

// Helper to create a keyboard event
const createKeyboardEvent = (key: string, shiftKey = false, altKey = false) => {
  return {
    key,
    shiftKey,
    altKey,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  } as unknown as React.KeyboardEvent;
};

describe("useKeyboardNavigation", () => {
  it("should initialize with the correct selected index", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
        initialSelectedIndex: 2,
      }),
    );

    expect(result.current.selectedIndex).toBe(2);
    expect(result.current.selectedItem).toEqual(sectionA[2]);
    expect(result.current.selectedSectionId).toBe("sectionA");
  });

  it("should navigate down with arrow keys", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
      }),
    );

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });

    expect(result.current.selectedIndex).toBe(1);
    expect(result.current.selectedItem).toEqual(sectionA[1]);

    // Move to next section
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });

    expect(result.current.selectedIndex).toBe(3);
    expect(result.current.selectedSectionId).toBe("sectionB");
    expect(result.current.selectedItem).toEqual(sectionB[0]);
  });

  it("should navigate up with arrow keys", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
        initialSelectedIndex: 3, // Start at first item in section B
      }),
    );

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowUp"));
    });

    expect(result.current.selectedIndex).toBe(2);
    expect(result.current.selectedSectionId).toBe("sectionA");
    expect(result.current.selectedItem).toEqual(sectionA[2]);
  });

  it("should wrap around when reaching the end or beginning", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
        initialSelectedIndex: 4, // Last item in section B
      }),
    );

    // Wrap to first item when at last item and pressing down
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });
    expect(result.current.selectedIndex).toBe(0);

    // Wrap to last item when at first item and pressing up
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowUp"));
    });
    expect(result.current.selectedIndex).toBe(4);
  });

  it("should handle Enter key selection", () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
        onSelect,
        initialSelectedIndex: 1,
      }),
    );

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Enter"));
    });

    expect(onSelect).toHaveBeenCalledWith(sectionA[1], "sectionA");
  });

  it("should handle Escape key", () => {
    const onEscape = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [{ id: "sectionA", items: sectionA }],
        onEscape,
      }),
    );

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Escape"));
    });

    expect(onEscape).toHaveBeenCalled();
  });

  it("should handle Tab and Shift+Tab navigation", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
        initialSelectedIndex: 1,
      }),
    );

    // Tab should move forward
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Tab"));
    });
    expect(result.current.selectedIndex).toBe(2);

    // Shift+Tab should move backward
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Tab", true));
    });
    expect(result.current.selectedIndex).toBe(1);
  });

  it("should handle Alt+Number shortcut keys", () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
        onSelect,
      }),
    );

    // Alt+2 should select and execute the second item
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("2", false, true));
    });

    expect(result.current.selectedIndex).toBe(1);
    expect(onSelect).toHaveBeenCalledWith(sectionA[1], "sectionA");

    // Alt+4 should select the fourth item (first item in section B)
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("4", false, true));
    });

    expect(result.current.selectedIndex).toBe(3);
    expect(onSelect).toHaveBeenCalledWith(sectionB[0], "sectionB");
  });

  it("should handle Home and End keys", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
        initialSelectedIndex: 2,
      }),
    );

    // Home should go to first item
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Home"));
    });
    expect(result.current.selectedIndex).toBe(0);

    // End should go to last item
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("End"));
    });
    expect(result.current.selectedIndex).toBe(4); // Total of 5 items (3 + 2), so index 4 is the last
  });

  it("should support section-specific selection handlers", () => {
    const sectionHandler = jest.fn();
    const globalHandler = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          {
            id: "sectionA",
            items: sectionA,
            onItemSelect: sectionHandler,
          },
          {
            id: "sectionB",
            items: sectionB,
          },
        ],
        onSelect: globalHandler,
      }),
    );

    // Select an item from section A, should use section handler
    act(() => {
      result.current.setSelectedIndex(0);
      result.current.handleKeyDown(createKeyboardEvent("Enter"));
    });

    expect(sectionHandler).toHaveBeenCalledWith(sectionA[0]);
    expect(globalHandler).not.toHaveBeenCalled();

    sectionHandler.mockClear();
    globalHandler.mockClear();

    // Select an item from section B, should use global handler
    act(() => {
      result.current.setSelectedIndex(3); // First item in section B
      result.current.handleKeyDown(createKeyboardEvent("Enter"));
    });

    expect(sectionHandler).not.toHaveBeenCalled();
    expect(globalHandler).toHaveBeenCalledWith(sectionB[0], "sectionB");
  });

  it("should handle Backspace key when input is empty", () => {
    const onBackspace = jest.fn();
    const inputRef = createRef<HTMLInputElement>();

    // Mock the current value of the input ref
    Object.defineProperty(inputRef, "current", {
      value: { value: "" },
      writable: true,
    });

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [{ id: "sectionA", items: sectionA }],
        onBackspace,
        inputRef,
      }),
    );

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Backspace"));
    });

    expect(onBackspace).toHaveBeenCalledWith(true);
  });

  it("should handle Backspace key when input is not empty", () => {
    const onBackspace = jest.fn();
    const inputRef = createRef<HTMLInputElement>();

    // Mock the current value of the input ref
    Object.defineProperty(inputRef, "current", {
      value: { value: "test" },
      writable: true,
    });

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [{ id: "sectionA", items: sectionA }],
        onBackspace,
        inputRef,
      }),
    );

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Backspace"));
    });

    expect(onBackspace).toHaveBeenCalledWith(false);
  });

  it("should handle custom key handlers", () => {
    const customHandler = jest.fn().mockReturnValue(true);
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [{ id: "sectionA", items: sectionA }],
        customKeyHandlers: {
          F1: customHandler,
        },
      }),
    );

    act(() => {
      const handled = result.current.handleKeyDown(createKeyboardEvent("F1"));
      expect(handled).toBe(true);
    });

    expect(customHandler).toHaveBeenCalled();
  });

  it("should return correct section start index", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
      }),
    );

    expect(result.current.getSectionStartIndex("sectionA")).toBe(0);
    expect(result.current.getSectionStartIndex("sectionB")).toBe(3);
  });

  it("should reset selection to initial index", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        sections: [
          { id: "sectionA", items: sectionA },
          { id: "sectionB", items: sectionB },
        ],
        initialSelectedIndex: 2,
      }),
    );

    // Change selection
    act(() => {
      result.current.setSelectedIndex(4);
    });
    expect(result.current.selectedIndex).toBe(4);

    // Reset selection
    act(() => {
      result.current.resetSelection();
    });
    expect(result.current.selectedIndex).toBe(2);
  });
});
