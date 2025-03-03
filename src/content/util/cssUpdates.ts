import {
  errorService,
  ErrorCategory,
  ErrorSeverity,
} from "../services/errorService";

/**
 * This utility fixes common CSS issues that might be causing rendering problems
 */

/**
 * Inject fixed version of CSS to override problematic styles
 */
export function fixCommandBoxCSS(): void {
  try {
    // Create a style element for our fixes
    const fixStyleElement = document.createElement("style");
    fixStyleElement.id = "cmd-k-style-fixes";

    // Fixes for various CSS issues
    fixStyleElement.textContent = `
      /* Fix visibility issues with wrapper */
      .cmd-k-wrapper {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 999998 !important;
        pointer-events: none !important;
        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;
        background-color: rgba(0, 0, 0, 0) !important;
        transition: background-color var(--cmd-k-animation-normal, 0.25s) ease-in !important;
        visibility: hidden !important;
      }

      /* Fix visibility when active */
      .cmd-k-wrapper.visible {
        visibility: visible !important;
        pointer-events: auto !important;
        background-color: var(--cmd-k-bg-overlay, rgba(0, 0, 0, 0.4)) !important;
        backdrop-filter: blur(2px) !important;
        transition: background-color var(--cmd-k-animation-normal, 0.25s) ease-out !important;
      }

      /* Fix command box appearance */
      .cmd-k-box {
        background-color: var(--cmd-k-bg-primary, #ffffff) !important;
        transform: translateY(-20px) !important;
        opacity: 0 !important;
        transition: transform 0.25s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.15s ease-in !important;
        margin-top: 10vh !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
        width: 600px !important;
        max-width: 90vw !important;
        overflow: visible !important;
      }

      /* Fix animation when showing */
      .cmd-k-wrapper.visible .cmd-k-box {
        transform: translateY(0) !important;
        opacity: 1 !important;
        transition: transform 0.25s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.25s ease-out !important;
      }
    `;

    // Add the style element to the head
    document.head.appendChild(fixStyleElement);

    console.log("CMDKite: Added CSS fixes");
  } catch (error) {
    errorService.captureException(error, {
      message: "Failed to apply CSS fixes",
      severity: ErrorSeverity.WARNING,
      category: ErrorCategory.UI,
    });
  }
}

/**
 * Inject fixes for z-index issues that might be preventing command box from showing
 */
export function fixZIndexConflicts(): void {
  try {
    // Find and fix potential z-index conflicts
    const highZIndexElements = findHighZIndexElements();

    if (highZIndexElements.length > 0) {
      console.log(
        `CMDKite: Found ${highZIndexElements.length} elements with high z-index that might conflict`,
      );

      // Add a style element with even higher z-index for our command box
      const zIndexFixStyle = document.createElement("style");
      zIndexFixStyle.id = "cmd-k-zindex-fixes";
      zIndexFixStyle.textContent = `
        /* Ensure CMDKite elements have higher z-index than anything else */
        .cmd-k-wrapper {
          z-index: 2147483647 !important; /* Maximum z-index value */
        }
        .cmd-k-box {
          z-index: 2147483647 !important;
        }
      `;

      document.head.appendChild(zIndexFixStyle);
    }
  } catch (error) {
    errorService.captureException(error, {
      message: "Failed to apply z-index fixes",
      severity: ErrorSeverity.WARNING,
      category: ErrorCategory.UI,
    });
  }
}

/**
 * Find elements with high z-index that might conflict with our command box
 */
function findHighZIndexElements(): Element[] {
  const allElements = document.querySelectorAll("*");
  const highZIndexElements: Element[] = [];

  // Get computed style for each element and check z-index
  allElements.forEach((element) => {
    const computedStyle = window.getComputedStyle(element);
    const zIndex = parseInt(computedStyle.zIndex, 10);

    // Consider anything over 1000 as potentially conflicting
    if (!isNaN(zIndex) && zIndex > 10000) {
      highZIndexElements.push(element);
    }
  });

  return highZIndexElements;
}

/**
 * Apply all CSS fixes
 */
export function applyAllCSSFixes(): void {
  fixCommandBoxCSS();
  fixZIndexConflicts();
}
