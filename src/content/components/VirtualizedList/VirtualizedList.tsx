import React, {
  useEffect,
  useRef,
  useState,
  ReactElement,
  useMemo,
} from "react";

interface VirtualizedListProps<T> {
  // The array of items to render
  items: T[];

  // Function to render each item
  renderItem: (item: T, index: number, isVisible: boolean) => ReactElement;

  // Height of each item in pixels (can be a function or fixed value)
  itemHeight: number | ((item: T, index: number) => number);

  // Optional className for the container
  className?: string;

  // Maximum height for the list container (px)
  maxHeight?: number;

  // Extra items to render above and below visible area (buffer)
  overscan?: number;

  // Optional keyExtractor function to generate keys for items
  keyExtractor?: (item: T, index: number) => string;

  // Function called when scrolling occurs
  onScroll?: (scrollTop: number) => void;

  // Optional selected index for scrolling to an item
  selectedIndex?: number;

  // ScrollToIndexBehavior
  scrollToSelectedBehavior?: "auto" | "smooth" | "center";
}

/**
 * A virtualized list component that only renders the items currently visible in the viewport.
 * This dramatically improves performance for large lists.
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  className = "",
  maxHeight = 400,
  overscan = 5,
  keyExtractor,
  onScroll,
  selectedIndex,
  scrollToSelectedBehavior = "auto",
}: VirtualizedListProps<T>) {
  // Ref for the container element
  const containerRef = useRef<HTMLDivElement>(null);

  // Current scroll position
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate item positions and total height
  const { itemPositions, totalHeight } = useMemo(() => {
    const positions: number[] = [];
    let currentPosition = 0;

    for (let i = 0; i < items.length; i++) {
      positions.push(currentPosition);

      const height =
        typeof itemHeight === "function" ? itemHeight(items[i], i) : itemHeight;

      currentPosition += height;
    }

    return {
      itemPositions: positions,
      totalHeight: currentPosition,
    };
  }, [items, itemHeight]);

  // Determine which items are visible
  const visibleItems = useMemo(() => {
    if (!containerRef.current) return [];

    const result: {
      item: T;
      index: number;
      offsetTop: number;
      height: number;
      isVisible: boolean;
    }[] = [];
    const containerHeight = containerRef.current.clientHeight;

    // Calculate visible range with overscan
    const startIndex = Math.max(
      0,
      findIndexOfClosestPosition(itemPositions, scrollTop) - overscan,
    );

    const endIndex = Math.min(
      items.length - 1,
      findIndexOfClosestPosition(itemPositions, scrollTop + containerHeight) +
        overscan,
    );

    // Add visible items to result
    for (let i = startIndex; i <= endIndex; i++) {
      const item = items[i];
      const offsetTop = itemPositions[i];
      const height =
        typeof itemHeight === "function" ? itemHeight(item, i) : itemHeight;

      // Check if item is actually visible in viewport
      const isVisible =
        offsetTop + height > scrollTop &&
        offsetTop < scrollTop + containerHeight;

      result.push({ item, index: i, offsetTop, height, isVisible });
    }

    return result;
  }, [items, itemPositions, scrollTop, itemHeight, overscan]);

  // Handle scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    if (onScroll) {
      onScroll(newScrollTop);
    }
  };

  // Find the index of the closest position to a target position
  function findIndexOfClosestPosition(
    positions: number[],
    targetPosition: number,
  ): number {
    // Binary search to find the closest position
    let start = 0;
    let end = positions.length - 1;

    // Handle edge cases
    if (targetPosition <= positions[0]) return 0;
    if (targetPosition >= positions[end]) return end;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);

      if (positions[mid] === targetPosition) {
        return mid; // Exact match
      }

      if (positions[mid] < targetPosition) {
        // Target is in the right half
        if (mid < positions.length - 1 && targetPosition < positions[mid + 1]) {
          // Target is between mid and mid+1
          return mid;
        }
        start = mid + 1;
      } else {
        // Target is in the left half
        end = mid - 1;
      }
    }

    return start;
  }

  // Scroll to selected item when selectedIndex changes
  useEffect(() => {
    if (
      selectedIndex === undefined ||
      selectedIndex < 0 ||
      selectedIndex >= items.length
    ) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Get position of selected item
    const itemTop = itemPositions[selectedIndex];

    // Calculate the height of the selected item
    const selectedItemHeight =
      typeof itemHeight === "function"
        ? itemHeight(items[selectedIndex], selectedIndex)
        : itemHeight;

    const itemBottom = itemTop + selectedItemHeight;

    // Check if item is already visible
    const isVisible =
      itemTop >= scrollTop && itemBottom <= scrollTop + container.clientHeight;

    if (!isVisible || scrollToSelectedBehavior === "center") {
      let targetScrollTop;

      // Center the item in the viewport if requested
      if (scrollToSelectedBehavior === "center") {
        targetScrollTop =
          itemTop - container.clientHeight / 2 + selectedItemHeight / 2;
      } else {
        // Otherwise scroll just enough to make it visible
        if (itemTop < scrollTop) {
          // Item is above visible area
          targetScrollTop = itemTop;
        } else if (itemBottom > scrollTop + container.clientHeight) {
          // Item is below visible area
          targetScrollTop = itemBottom - container.clientHeight;
        } else {
          // Item is already visible
          return;
        }
      }

      // Clamp the scroll position
      targetScrollTop = Math.max(
        0,
        Math.min(
          targetScrollTop,
          container.scrollHeight - container.clientHeight,
        ),
      );

      // Scroll to the position
      container.scrollTo({
        top: targetScrollTop,
        behavior: scrollToSelectedBehavior === "smooth" ? "smooth" : "auto",
      });

      // Update state if we're doing an instant scroll
      if (scrollToSelectedBehavior !== "smooth") {
        setScrollTop(targetScrollTop);
      }
    }
  }, [
    selectedIndex,
    items,
    itemPositions,
    scrollTop,
    scrollToSelectedBehavior,
    itemHeight,
  ]);

  return (
    <div
      ref={containerRef}
      className={`virtualized-list ${className}`}
      style={{
        maxHeight: `${maxHeight}px`,
        overflowY: "auto",
        position: "relative",
      }}
      onScroll={handleScroll}
    >
      {/* Container with total height to enable scrolling */}
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        {/* Render only visible items */}
        {visibleItems.map(({ item, index, offsetTop, height, isVisible }) => (
          <div
            key={keyExtractor ? keyExtractor(item, index) : index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: `${height}px`,
              transform: `translateY(${offsetTop}px)`,
            }}
          >
            {renderItem(item, index, isVisible)}
          </div>
        ))}
      </div>
    </div>
  );
}
