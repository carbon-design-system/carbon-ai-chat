/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { Token } from "markdown-it";

import type {
  TableCellContent,
  TableRowContent,
} from "../../../table/src/table.js";
import { combineConsecutiveHtmlInline } from "./html-helpers.js";
import { isTableAtStreamingTail } from "./streaming-table.js";
import type { RenderTokenTreeOptions } from "../markdown-renderer-types.js";
import type { TokenTree } from "../markdown-token-tree";

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

export interface TableCellData {
  text: string;
  tokens: TokenTree[] | null;
}

/**
 * Extracts tabular data from a table TokenTree node.
 *
 * Converts the hierarchical markdown table structure into the flat
 * header/rows format expected by the cds-aichat-table component while retaining
 * the TokenTree children required for rich rendering within cells.
 */
export function extractTableData(tableNode: TokenTree): {
  headers: TableCellData[];
  rows: TableCellData[][];
} {
  const headers: TableCellData[] = [];
  const rows: TableCellData[][] = [];

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
    } else if (child.token.tag === "tbody") {
      // Extract data rows
      for (const tbodyChild of child.children) {
        if (tbodyChild.token.tag === "tr") {
          const row: TableCellData[] = [];
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
export function extractTextContent(node: TokenTree): string {
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

function extractCellData(node: TokenTree): TableCellData {
  const text = extractTextContent(node);
  const tokens = extractRenderableChildren(node);
  const hasRichContent = tokens.some((child) => child.token.type !== "text");

  return {
    text,
    tokens: hasRichContent ? tokens : null,
  };
}

function extractRenderableChildren(node: TokenTree): TokenTree[] {
  if (node.children.length === 1) {
    const onlyChild = node.children[0];
    if (
      onlyChild.token.type === "inline" &&
      onlyChild.children &&
      onlyChild.children.length
    ) {
      return onlyChild.children;
    }
  }

  return node.children;
}

/**
 * Renders the body of the `case "table"` branch of `renderWithStaticTag`.
 *
 * Lives outside the renderer's switch because it covers three flows: streaming
 * loading state, default Carbon-table rendering, and the `customRenderers.table`
 * slot override.
 *
 * `renderToken` is the recursive renderer the caller dispatched from, passed in
 * to avoid a cycle with `markdown-renderer.ts`. `slotName` is non-undefined when
 * the consumer registered a `table` custom renderer, in which case the result is
 * wrapped in a named `<slot>` and an override descriptor is reported via
 * `recordCustomRender`.
 */
export function renderTable(
  token: Token,
  node: TokenTree,
  attrs: Record<string, string>,
  options: RenderTokenTreeOptions,
  renderToken: (
    node: TokenTree,
    options: RenderTokenTreeOptions,
  ) => TemplateResult,
  slotName: string | undefined,
): TemplateResult {
  const {
    streaming,
    forceTableLoading,
    context: parentContext,
    tableFilterPlaceholderText,
    tablePreviousPageText,
    tableNextPageText,
    tableItemsPerPageText,
    tableDownloadLabelText,
    tableLocale,
    tableGetPaginationSupplementalText,
    tableGetPaginationStatusText,
  } = options;

  // Determine if we should show loading state during streaming
  let isLoading = Boolean(forceTableLoading);
  if (
    !isLoading &&
    streaming &&
    parentContext?.parentChildren &&
    parentContext?.currentIndex !== undefined
  ) {
    isLoading = isTableAtStreamingTail(
      parentContext.parentChildren,
      parentContext.currentIndex,
    );
  }

  const renderCellTokens = (tokens: TokenTree[], contextOverrides = {}) => {
    // Same as block/inline rendering: merge split raw HTML (e.g. `<a>…</a>`)
    // so each cell is not rendered as separate unsafeHTML + text chunks.
    const normalizedTokens = combineConsecutiveHtmlInline(tokens);
    return html`${repeat(
      normalizedTokens,
      (child, index) => `cell-${index}:${child.token.type}:${child.token.tag}`,
      (child, index) =>
        renderToken(child, {
          ...options,
          context: {
            ...options.context,
            ...contextOverrides,
            parentChildren: normalizedTokens,
            currentIndex: index,
          },
        }),
    )}`;
  };

  const createCellContent = (
    cell: TableCellData,
    contextOverrides?: Record<string, unknown>,
  ): TableCellContent => ({
    text: cell.text,
    template: cell.tokens
      ? renderCellTokens(cell.tokens, contextOverrides)
      : null,
  });

  // Only extract and process table data when not loading to avoid unnecessary work.
  // During loading, the table shows a skeleton and doesn't need the actual data.
  let headers: TableCellContent[] = [];
  let tableRows: TableRowContent[] = [];

  if (!isLoading) {
    const extractedData = extractTableData(node);
    headers = extractedData.headers.map((cell) =>
      createCellContent(cell, { isInThead: true }),
    );
    tableRows = extractedData.rows.map((row) => ({
      cells: row.map((cell) => createCellContent(cell)),
    }));
  }

  // Always return the same structure to allow Lit to reuse the table element.
  // When isLoading is true, the table component will show a skeleton state.
  // When isLoading is false, it will show the actual data.
  // This prevents recreating the table element and preserves its internal state.
  const defaultTableTemplate = html`<div class="cds-aichat-table--square">
    <cds-aichat-table
      data-rounded
      .headers=${headers}
      .rows=${tableRows}
      .loading=${isLoading}
      .filterPlaceholderText=${tableFilterPlaceholderText}
      .previousPageText=${tablePreviousPageText}
      .nextPageText=${tableNextPageText}
      .itemsPerPageText=${tableItemsPerPageText}
      .downloadLabelText=${tableDownloadLabelText}
      .locale=${tableLocale}
      .getPaginationSupplementalText=${tableGetPaginationSupplementalText}
      .getPaginationStatusText=${tableGetPaginationStatusText}
      ...=${attrs}
    ></cds-aichat-table>
  </div>`;

  if (slotName !== undefined) {
    // For the override path we pass the raw extracted cell data (not the
    // Lit-wrapped TableCellContent) so consumers can render however they
    // like. Extract once even when loading so the consumer always gets
    // the data — they can read `isLoading` to choose a skeleton state.
    const { headers: dataHeaders, rows: dataRows } = extractTableData(node);
    options.recordCustomRender?.({
      slotName,
      kind: "table",
      token,
      node,
      data: {
        headers: dataHeaders,
        rows: dataRows,
        isStreaming: !!streaming,
        isLoading,
      },
    });
    return html`<slot name=${slotName}>${defaultTableTemplate}</slot>`;
  }

  return defaultTableTemplate;
}
