/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
function buildContainerStyles({ expanded, maxCollapsed, maxExpanded, minCollapsed, minExpanded, rowHeight, }) {
    const styles = [];
    if (expanded) {
        if (maxExpanded > 0) {
            const maxHeight = `${maxExpanded * rowHeight}px`;
            styles.push(`max-height: ${maxHeight}`);
            styles.push(`--cds-custom-snippet-max-height: ${maxHeight}`);
        }
        else {
            // Remove the default CodeMirror max height so expanded snippets can grow to fit content
            styles.push(`max-height: none`);
            styles.push(`--cds-custom-snippet-max-height: none`);
        }
        if (minExpanded > 0) {
            const minHeight = `${minExpanded * rowHeight}px`;
            styles.push(`min-height: ${minHeight}`);
            styles.push(`--cds-custom-snippet-min-height: ${minHeight}`);
        }
    }
    else {
        if (maxCollapsed > 0) {
            const maxHeight = `${maxCollapsed * rowHeight}px`;
            styles.push(`max-height: ${maxHeight}`);
            styles.push(`--cds-custom-snippet-max-height: ${maxHeight}`);
        }
        if (minCollapsed > 0) {
            const minHeight = `${minCollapsed * rowHeight}px`;
            styles.push(`min-height: ${minHeight}`);
            styles.push(`--cds-custom-snippet-min-height: ${minHeight}`);
        }
    }
    return styles.join("; ");
}
function evaluateShowMoreButton({ shadowRoot, rowHeight, expanded, maxCollapsed, maxExpanded, minExpanded, }) {
    const editorNode = shadowRoot?.querySelector(`.cm-content`);
    if (!editorNode) {
        return { shouldShowButton: false, shouldCollapse: false };
    }
    const { height } = editorNode.getBoundingClientRect();
    const shouldShowButton = maxCollapsed > 0 &&
        (maxExpanded <= 0 || maxExpanded > maxCollapsed) &&
        height > maxCollapsed * rowHeight;
    const shouldCollapse = expanded && minExpanded > 0 && height <= minExpanded * rowHeight;
    return { shouldShowButton, shouldCollapse };
}

export { buildContainerStyles, evaluateShowMoreButton };
//# sourceMappingURL=layout-utils.js.map
