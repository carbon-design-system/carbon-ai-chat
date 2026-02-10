/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Pure utility functions for workspace layout calculations.
 * These functions have no side effects and depend only on their inputs.
 */

/**
 * Calculate the minimum width required for side-by-side layout.
 *
 * @param dimensions - Layout dimensions
 * @param dimensions.workspaceMinWidth - Minimum width for workspace area
 * @param dimensions.messagesMinWidth - Minimum width for messages area
 * @param dimensions.historyWidth - Width for history panel
 * @returns Total minimum width required
 */
export function calculateRequiredWidth(dimensions: {
  workspaceMinWidth: number;
  messagesMinWidth: number;
  historyWidth: number;
}): number {
  return (
    dimensions.workspaceMinWidth +
    dimensions.messagesMinWidth +
    dimensions.historyWidth
  );
}

/**
 * Check if width change exceeds the threshold for meaningful expansion.
 *
 * @param current - Current width value
 * @param initial - Initial width value
 * @param threshold - Minimum change threshold in pixels
 * @returns True if the absolute difference exceeds the threshold
 */
export function hasSignificantWidthChange(
  current: number,
  initial: number,
  threshold: number,
): boolean {
  return Math.abs(current - initial) > threshold;
}

/**
 * Check if the host element is wide enough for side-by-side layout.
 *
 * @param inlineSize - Current width of the host element
 * @param requiredWidth - Minimum width required for side-by-side layout
 * @returns True if wide enough, or if running in SSR context
 */
export function isWideEnough(
  inlineSize: number,
  requiredWidth: number,
): boolean {
  return typeof window === "undefined" || inlineSize >= requiredWidth;
}

/**
 * Check if the host element can potentially grow to the required width.
 *
 * @param requiredWidth - Minimum width required for side-by-side layout
 * @returns True if window width is sufficient, false in SSR context
 */
export function canHostGrow(requiredWidth: number): boolean {
  return typeof window !== "undefined" && window.innerWidth >= requiredWidth;
}

/**
 * Extract inline size from a ResizeObserverEntry.
 *
 * @param entry - ResizeObserver entry containing size information
 * @returns The inline size in pixels
 */
export function getInlineSizeFromEntry(entry: ResizeObserverEntry): number {
  const borderBoxSize = Array.isArray(entry.borderBoxSize)
    ? entry.borderBoxSize[0]
    : entry.borderBoxSize;
  return borderBoxSize?.inlineSize ?? entry.contentRect.width;
}

/**
 * Parse a CSS length value from a computed style property.
 *
 * @param element - Element to get computed style from
 * @param propertyName - CSS custom property name
 * @param fallback - Fallback value if property is not set or invalid
 * @returns Parsed numeric value or fallback
 */
export function getCssLengthFromProperty(
  element: HTMLElement,
  propertyName: string,
  fallback: number,
): number {
  const value = getComputedStyle(element).getPropertyValue(propertyName).trim();
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Check if workspace DOM attributes match the expected panel state.
 *
 * @param element - Host element containing workspace attributes
 * @param inPanel - Expected panel state
 * @returns True if both attributes are correctly set
 */
export function areWorkspaceAttributesCorrect(
  element: HTMLElement,
  inPanel: boolean,
): boolean {
  const panelAttrExists = element.hasAttribute("workspace-in-panel");
  const containerAttrExists = element.hasAttribute("workspace-in-container");

  return panelAttrExists === inPanel && containerAttrExists === !inPanel;
}

/**
 * Check if workspace update should be skipped based on current state.
 *
 * @param config - Workspace configuration
 * @param config.showWorkspace - Whether workspace is enabled
 * @param state - Current workspace state
 * @param state.containerVisible - Whether workspace container is visible
 * @param state.isContracting - Whether workspace is currently contracting
 * @returns True if update should be skipped
 */
export function shouldSkipWorkspaceUpdate(
  config: { showWorkspace: boolean },
  state: { containerVisible: boolean; isContracting: boolean },
): boolean {
  return (
    !config.showWorkspace || !state.containerVisible || state.isContracting
  );
}

// Made with Bob
