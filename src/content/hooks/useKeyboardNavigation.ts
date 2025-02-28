import { useState, useCallback, useEffect, RefObject } from "react";

/**
 * Types for the section configuration and item structure
 */
export interface KeyboardNavigationSection<T> {
  id: string;
  items: T[];
  getItemId?: (item: T, index: number) => string;
  onItemSelect?: (item: T) => void;
}

export interface KeyboardNavigationConfig<T> {
  sections: KeyboardNavigationSection<T>[];
  onSelect?: (item: T, sectionId: string) => void;
  onEscape?: () => void;
  onBackspace?: (isEmpty: boolean) => void;
  containerRef?: RefObject<HTMLElement>;
  inputRef?: RefObject<HTMLInputElement>;
  initialSelectedIndex?: number;
  shouldScrollToSelected?: boolean;
  defaultSection?: string;
  customKeyHandlers?: Record<string, (e: React.KeyboardEvent) => boolean>;
}

export interface KeyboardNavigationResult<T> {
  selectedIndex: number;
  selectedItem: T | null;
  selectedSectionId: string | null;
  getTotalItems: () => number;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  setSelectedIndex: (index: number) => void;
  resetSelection: () => void;
  getSectionStartIndex: (sectionId: string) => number;
}

/**
 * A hook to handle keyboard navigation across multiple sections of items
 */
export function useKeyboardNavigation<T>(
  config: KeyboardNavigationConfig<T>,
): KeyboardNavigationResult<T> {
  // Initialize state
  const [selectedIndex, setSelectedIndex] = useState<number>(
    config.initialSelectedIndex || 0,
  );

  // Calculate total items across all sections
  const getTotalItems = useCallback(() => {
    return config.sections.reduce(
      (total, section) => total + section.items.length,
      0,
    );
  }, [config.sections]);

  // Calculate section start indices
  const getSectionStartIndices = useCallback(() => {
    const indices: Record<string, number> = {};
    let currentIndex = 0;

    config.sections.forEach((section) => {
      indices[section.id] = currentIndex;
      currentIndex += section.items.length;
    });

    return indices;
  }, [config.sections]);

  // Get section start index
  const getSectionStartIndex = useCallback(
    (sectionId: string) => {
      const indices = getSectionStartIndices();
      return indices[sectionId] || 0;
    },
    [getSectionStartIndices],
  );

  // Find the section and item for a given global index
  const getItemAtIndex = useCallback(
    (
      index: number,
    ): {
      item: T | null;
      sectionId: string | null;
      localIndex: number;
    } => {
      let currentIndex = 0;

      for (const section of config.sections) {
        if (
          index >= currentIndex &&
          index < currentIndex + section.items.length
        ) {
          const localIndex = index - currentIndex;
          return {
            item: section.items[localIndex],
            sectionId: section.id,
            localIndex,
          };
        }
        currentIndex += section.items.length;
      }

      return { item: null, sectionId: null, localIndex: -1 };
    },
    [config.sections],
  );

  // Function to get the currently selected item, section and local index
  const getSelectedItem = useCallback(() => {
    return getItemAtIndex(selectedIndex);
  }, [selectedIndex, getItemAtIndex]);

  // Reset selection to default or first item
  const resetSelection = useCallback(() => {
    setSelectedIndex(config.initialSelectedIndex || 0);
  }, [config.initialSelectedIndex]);

  // Scroll selected element into view
  const scrollSelectedIntoView = useCallback(() => {
    if (!config.shouldScrollToSelected) return;

    requestAnimationFrame(() => {
      if (!config.containerRef?.current) return;

      const selectedElement =
        config.containerRef.current.querySelector(".selected");
      const container = config.containerRef.current;

      if (!selectedElement || !container) return;

      const containerRect = container.getBoundingClientRect();
      const selectedRect = selectedElement.getBoundingClientRect();

      // Check if element is outside visible area
      if (selectedRect.bottom > containerRect.bottom) {
        // Element is below visible area
        container.scrollTop += selectedRect.bottom - containerRect.bottom + 8;
      } else if (selectedRect.top < containerRect.top) {
        // Element is above visible area
        container.scrollTop -= containerRect.top - selectedRect.top + 8;
      }
    });
  }, [config.containerRef, config.shouldScrollToSelected]);

  // Update scroll when selected index changes
  useEffect(() => {
    scrollSelectedIntoView();
  }, [selectedIndex, scrollSelectedIntoView]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      // Check for custom key handlers first
      if (
        config.customKeyHandlers?.[e.key] &&
        config.customKeyHandlers[e.key](e)
      ) {
        return true;
      }

      const totalItems = getTotalItems();

      switch (e.key) {
        case "Escape":
          if (config.onEscape) {
            e.preventDefault();
            config.onEscape();
            return true;
          }
          break;

        case "ArrowDown":
          if (totalItems === 0) return false;
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = prev >= totalItems - 1 ? 0 : prev + 1;
            return newIndex;
          });
          return true;

        case "ArrowUp":
          if (totalItems === 0) return false;
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = prev <= 0 ? totalItems - 1 : prev - 1;
            return newIndex;
          });
          return true;

        case "Tab":
          // If there are items, then handle tab navigation
          if (totalItems > 0) {
            e.preventDefault();
            setSelectedIndex((prev) => {
              const direction = e.shiftKey ? -1 : 1;
              const newIndex = (prev + direction + totalItems) % totalItems;
              return newIndex;
            });
            return true;
          }
          break;

        case "Enter":
          if (totalItems === 0) return false;

          e.preventDefault();
          const { item, sectionId } = getSelectedItem();

          if (item && sectionId) {
            // First try section-specific handler
            const section = config.sections.find((s) => s.id === sectionId);
            if (section?.onItemSelect) {
              section.onItemSelect(item);
              return true;
            }

            // Fall back to global handler
            if (config.onSelect) {
              config.onSelect(item, sectionId);
              return true;
            }
          }
          break;

        case "Home":
          if (totalItems === 0) return false;
          e.preventDefault();
          setSelectedIndex(0);
          return true;

        case "End":
          if (totalItems === 0) return false;
          e.preventDefault();
          setSelectedIndex(totalItems - 1);
          return true;

        case "Backspace":
          if (config.onBackspace) {
            const isEmpty = (config.inputRef?.current?.value || "") === "";
            config.onBackspace(isEmpty);
            return true;
          }
          break;

        // Handle Alt+Number shortcuts
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          if (e.altKey && totalItems > 0) {
            e.preventDefault();
            const digitIndex = parseInt(e.key, 10) - 1;
            if (digitIndex < totalItems) {
              setSelectedIndex(digitIndex);

              // Auto-execute the selected item
              const { item, sectionId } = getItemAtIndex(digitIndex);
              if (item && sectionId) {
                const section = config.sections.find((s) => s.id === sectionId);
                if (section?.onItemSelect) {
                  section.onItemSelect(item);
                } else if (config.onSelect) {
                  config.onSelect(item, sectionId);
                }
              }

              return true;
            }
          }
          break;
      }

      return false;
    },
    [
      config.onEscape,
      config.onSelect,
      config.onBackspace,
      config.inputRef,
      config.sections,
      config.customKeyHandlers,
      getTotalItems,
      getSelectedItem,
      getItemAtIndex,
    ],
  );

  // Get currently selected item and section
  const { item: selectedItem, sectionId: selectedSectionId } =
    getSelectedItem();

  // Return the API for the hook
  return {
    selectedIndex,
    selectedItem,
    selectedSectionId,
    getTotalItems,
    handleKeyDown,
    setSelectedIndex,
    resetSelection,
    getSectionStartIndex,
  };
}
