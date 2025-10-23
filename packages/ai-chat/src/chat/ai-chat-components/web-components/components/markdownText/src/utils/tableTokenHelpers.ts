/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { TokenTree } from "../markdownTokenTree";

// Static constants to provide the table component when we are just showing the skeleton.
export const EMPTY_HEADERS: string[] = [];
export const EMPTY_TABLE_ROWS: { cells: string[] }[] = [];

// Default localization functions for table pagination
export const DEFAULT_PAGINATION_SUPPLEMENTAL_TEXT = ({
  count,
}: {
  count: number;
}) => `${count} items`;
export const DEFAULT_PAGINATION_STATUS_TEXT = ({
  start,
  end,
  count,
}: {
  start: number;
  end: number;
  count: number;
}) => `${start}–${end} of ${count} items`;

/**
 * Extracts tabular data from a table TokenTree node.
 *
 * Converts the hierarchical markdown table structure into the flat
 * header/rows format expected by the cds-aichat-table component.
 */
export function extractTableData(tableNode: TokenTree): {
  headers: string[];
  rows: string[][];
} {
  const headers: string[] = [];
  const rows: string[][] = [];

  for (const child of tableNode.children) {
    if (child.token.tag === "thead") {
      // Extract column headers
      for (const theadChild of child.children) {
        if (theadChild.token.tag === "tr") {
          for (const thChild of theadChild.children) {
            if (thChild.token.tag === "th") {
              headers.push(extractTextContent(thChild));
            }
          }
        }
      }
    } else if (child.token.tag === "tbody") {
      // Extract data rows
      for (const tbodyChild of child.children) {
        if (tbodyChild.token.tag === "tr") {
          const row: string[] = [];
          for (const tdChild of tbodyChild.children) {
            if (tdChild.token.tag === "td") {
              row.push(extractTextContent(tdChild));
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
export function extractTextContent(node: TokenTree): string {
  // Handle direct text tokens
  if (node.token.type === "text") {
    return node.token.content;
  }

  // Handle inline code
  if (node.token.type === "code_inline") {
    return node.token.content;
  }

  // Recursively extract text from child nodes
  let text = "";
  for (const child of node.children) {
    text += extractTextContent(child);
  }

  return text;
}
