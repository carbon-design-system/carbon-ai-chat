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
// Default localization functions for table pagination
const DEFAULT_PAGINATION_SUPPLEMENTAL_TEXT = ({ count, }) => `${count} items`;
const DEFAULT_PAGINATION_STATUS_TEXT = ({ start, end, count, }) => `${start}–${end} of ${count} items`;
/**
 * Extracts tabular data from a table TokenTree node.
 *
 * Converts the hierarchical markdown table structure into the flat
 * header/rows format expected by the cds-aichat-table component while retaining
 * the TokenTree children required for rich rendering within cells.
 */
function extractTableData(tableNode) {
    const headers = [];
    const rows = [];
    for (const child of tableNode.children) {
        if (child.token.tag === "thead") {
            // Extract column headers
            for (const theadChild of child.children) {
                if (theadChild.token.tag === "tr") {
                    for (const thChild of theadChild.children) {
                        if (thChild.token.tag === "th") {
                            headers.push(extractCellData(thChild));
                        }
                    }
                }
            }
        }
        else if (child.token.tag === "tbody") {
            // Extract data rows
            for (const tbodyChild of child.children) {
                if (tbodyChild.token.tag === "tr") {
                    const row = [];
                    for (const tdChild of tbodyChild.children) {
                        if (tdChild.token.tag === "td") {
                            row.push(extractCellData(tdChild));
                        }
                    }
                    rows.push(row);
                }
            }
        }
    }
    return { headers, rows };
}
/**
 * Recursively extracts plain text content from a TokenTree node.
 *
 * This is used for table cells and other contexts where we need the
 * text content without HTML formatting.
 */
function extractTextContent(node) {
    // Handle direct text tokens
    if (node.token.type === "text") {
        return node.token.content || "";
    }
    // Handle inline code
    if (node.token.type === "code_inline") {
        return node.token.content || "";
    }
    if (node.token.type === "softbreak" || node.token.type === "hardbreak") {
        return "\n";
    }
    // Recursively extract text from child nodes
    let text = "";
    for (const child of node.children) {
        text += extractTextContent(child);
    }
    return text;
}
function extractCellData(node) {
    const text = extractTextContent(node);
    const tokens = extractRenderableChildren(node);
    const hasRichContent = tokens.some((child) => child.token.type !== "text");
    return {
        text,
        tokens: hasRichContent ? tokens : null,
    };
}
function extractRenderableChildren(node) {
    if (node.children.length === 1) {
        const onlyChild = node.children[0];
        if (onlyChild.token.type === "inline" &&
            onlyChild.children &&
            onlyChild.children.length) {
            return onlyChild.children;
        }
    }
    return node.children;
}

export { DEFAULT_PAGINATION_STATUS_TEXT, DEFAULT_PAGINATION_SUPPLEMENTAL_TEXT, extractTableData, extractTextContent };
//# sourceMappingURL=table-helpers.js.map
