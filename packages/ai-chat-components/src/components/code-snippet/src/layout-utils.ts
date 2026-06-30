/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface ContainerStyleConfig {
  expanded: boolean;
  maxCollapsed: number;
  maxExpanded: number;
  minCollapsed: number;
  minExpanded: number;
  rowHeight: number;
}

/**
 * Container style properties as CSS custom properties.
 * Applied via the shared dynamic stylesheet (`setVarsForSelector`), not
 * `element.style.setProperty`, so a strict CSP can drop
 * `style-src-attr 'unsafe-inline'`.
 */
export interface ContainerStyleProperties {
  "--cds-snippet-max-height"?: string;
  "--cds-snippet-min-height"?: string;
}

export function buildContainerStyles({
  expanded,
  maxCollapsed,
  maxExpanded,
  minCollapsed,
  minExpanded,
  rowHeight,
}: ContainerStyleConfig): ContainerStyleProperties {
  const properties: ContainerStyleProperties = {};

  // Detect fill-container mode: when both max properties are 0
  const isFillMode = maxCollapsed === 0 && maxExpanded === 0;

  if (isFillMode) {
    // Fill-container mode: use 100% height with scrollbar
    properties["--cds-snippet-max-height"] = "100%";
    properties["--cds-snippet-min-height"] = "auto";
    return properties;
  }

  // Existing row-based logic. `Infinity` opts into "grow with content" —
  // the relevant clamp is dropped so the snippet fits its content with no
  // internal scrollbar. Pair `maxCollapsedNumberOfRows: Infinity` and
  // `maxExpandedNumberOfRows: Infinity` (and optionally `min*=0`) to embed
  // the snippet inside another scrollable surface.
  if (expanded) {
    if (maxExpanded === Infinity) {
      properties["--cds-snippet-max-height"] = "none";
    } else if (maxExpanded > 0) {
      properties["--cds-snippet-max-height"] = `${maxExpanded * rowHeight}px`;
    } else {
      // Remove the default CodeMirror max height so expanded snippets can grow to fit content
      properties["--cds-snippet-max-height"] = "none";
    }
    if (minExpanded > 0 && minExpanded !== Infinity) {
      properties["--cds-snippet-min-height"] = `${minExpanded * rowHeight}px`;
    }
  } else {
    if (maxCollapsed === Infinity) {
      properties["--cds-snippet-max-height"] = "none";
    } else if (maxCollapsed > 0) {
      properties["--cds-snippet-max-height"] = `${maxCollapsed * rowHeight}px`;
    }
    if (minCollapsed > 0 && minCollapsed !== Infinity) {
      properties["--cds-snippet-min-height"] = `${minCollapsed * rowHeight}px`;
    }
  }

  return properties;
}

interface ShowMoreEvaluationInput {
  shadowRoot: ShadowRoot | null;
  rowHeight: number;
  expanded: boolean;
  maxCollapsed: number;
  maxExpanded: number;
  minExpanded: number;
}

export function evaluateShowMoreButton({
  shadowRoot,
  rowHeight,
  expanded,
  maxCollapsed,
  maxExpanded,
  minExpanded,
}: ShowMoreEvaluationInput): {
  shouldShowButton: boolean;
  shouldCollapse: boolean;
} {
  // Hide button in fill-container mode or in unbounded grow mode — in both
  // cases the snippet either fills its host or fits its content and there is
  // no max to expand past, so the show-more affordance has nothing to do.
  const isFillMode = maxCollapsed === 0 && maxExpanded === 0;
  const isGrowMode = maxCollapsed === Infinity || maxExpanded === Infinity;
  if (isFillMode || isGrowMode) {
    return { shouldShowButton: false, shouldCollapse: false };
  }

  const editorNode = shadowRoot?.querySelector(`.cm-content`);

  if (!editorNode) {
    return { shouldShowButton: false, shouldCollapse: false };
  }

  const { height } = editorNode.getBoundingClientRect();

  const shouldShowButton =
    maxCollapsed > 0 &&
    (maxExpanded <= 0 || maxExpanded > maxCollapsed) &&
    height > maxCollapsed * rowHeight;

  const shouldCollapse =
    expanded && minExpanded > 0 && height <= minExpanded * rowHeight;

  return { shouldShowButton, shouldCollapse };
}
