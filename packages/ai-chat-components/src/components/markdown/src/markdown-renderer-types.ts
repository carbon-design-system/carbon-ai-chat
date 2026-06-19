/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type MarkdownIt from "markdown-it";
import type { Token } from "markdown-it";

import type { TableCellData } from "./utils/table-helpers.js";
import type { TokenTree } from "./markdown-token-tree.js";

/**
 * Data payload describing a markdown table the consumer can render in place
 * of the default `cds-aichat-table`.
 *
 * @category Messaging
 */
export interface MarkdownRendererTableData {
  /** Cells extracted from the table's `<thead>`, in column order. */
  headers: TableCellData[];
  /** Body rows, each an array of cells in column order. */
  rows: TableCellData[][];
  /**
   * True while the chat is still receiving chunks of the message this table
   * belongs to.
   */
  isStreaming: boolean;
  /**
   * True when the table should render its skeleton/loading state instead of
   * cell data — set by the component while a streaming table sits at the tail
   * of the message and the next chunk may still add rows.
   */
  isLoading: boolean;
}

/**
 * Data payload describing a markdown fenced code block the consumer can
 * render in place of the default `cds-aichat-code-snippet`.
 *
 * @category Messaging
 */
export interface MarkdownRendererCodeBlockData {
  /** Language identifier from the fence info string (empty when unset). */
  language: string;
  /** The raw code text inside the fence. May be incomplete while streaming. */
  code: string;
  /**
   * True while the chat is still receiving chunks of the message this code
   * block belongs to.
   */
  isStreaming: boolean;
}

/**
 * Argument passed to a markdown table custom renderer callback.
 *
 * @category Messaging
 */
export interface MarkdownRendererTableArgs extends MarkdownRendererTableData {
  /**
   * The markdown-it `Token` (a `table_open`) for the matched element — see
   * the `markdown-it` `Token` documentation for the field shape.
   */
  token: Readonly<Token>;
  /** The full token-tree node, including descendants. */
  node: Readonly<TokenTree>;
  /**
   * Stable slot identifier for this rendered element. The same name is
   * reused across renders while the underlying source line stays put — useful
   * as a React key.
   */
  slotName: string;
}

/**
 * Argument passed to a markdown fenced code block custom renderer callback.
 *
 * @category Messaging
 */
export interface MarkdownRendererCodeBlockArgs extends MarkdownRendererCodeBlockData {
  /**
   * The markdown-it `Token` (a `fence`) for the matched element — see the
   * `markdown-it` `Token` documentation for the field shape.
   */
  token: Readonly<Token>;
  /** The full token-tree node. */
  node: Readonly<TokenTree>;
  /**
   * Stable slot identifier for this rendered element. The same name is
   * reused across renders while the underlying source line stays put — useful
   * as a React key.
   */
  slotName: string;
}

/**
 * Per-element custom renderer callbacks accepted by the markdown element.
 * Each callback returns an `HTMLElement` to use in place of the default
 * Carbon rendering, or `null` to fall back to the default. Returned elements
 * are adopted as light-DOM children of the markdown element (wrapped in a
 * `<div slot="…">` host so the consumer's element is not mutated) and
 * projected through a named shadow-DOM `<slot>`. External CSS continues to
 * apply normally.
 *
 * @category Messaging
 */
export interface MarkdownCustomRenderers {
  /** Override the default `cds-aichat-table` rendering. */
  table?: (args: MarkdownRendererTableArgs) => HTMLElement | null;
  /** Override the default `cds-aichat-code-snippet` rendering. */
  codeBlock?: (args: MarkdownRendererCodeBlockArgs) => HTMLElement | null;
}

/**
 * Internal descriptor produced by the renderer for each custom-renderable
 * element it encounters. Consumed by the markdown element's `updated()`
 * reconcile, not exposed publicly.
 *
 * @internal
 */
export type MarkdownRendererSlotDescriptor =
  | {
      slotName: string;
      kind: "table";
      token: Readonly<Token>;
      node: Readonly<TokenTree>;
      data: MarkdownRendererTableData;
    }
  | {
      slotName: string;
      kind: "codeBlock";
      token: Readonly<Token>;
      node: Readonly<TokenTree>;
      data: MarkdownRendererCodeBlockData;
    }
  | {
      slotName: string;
      kind: "pluginFallback";
      token: Readonly<Token>;
      node: Readonly<TokenTree>;
      /**
       * Sanitized HTML produced by the user plugin's renderer rule. The
       * markdown element assigns this to a light-DOM slot host's `innerHTML`
       * (skipping the write when it hasn't changed) so consumer-supplied
       * CSS reaches the rendered output.
       */
      html: string;
      /**
       * True when the matched markdown-it `token.block === false` (an inline
       * token like `math_inline`). The reconciler uses this to pick `<span>`
       * vs `<div>` for the slot host so inline plugin output doesn't break
       * paragraph flow. Carried on the descriptor so listeners outside the
       * markdown element (the chat container's host-mount handler) can make
       * the same decision without re-inspecting the token.
       */
      isInline: boolean;
    };

/**
 * Internal configuration passed to the renderer.
 *
 * @internal
 */
export interface RenderTokenTreeOptions {
  /** Whether to sanitize HTML content using DOMPurify. */
  sanitize: boolean;

  /** Whether content is being streamed (affects loading states). */
  streaming?: boolean;

  /** Context information for nested rendering. */
  context?: {
    /** Whether we're currently inside a table header. */
    isInThead?: boolean;
    /** All children of the parent node. */
    parentChildren?: TokenTree[];
    /** Current index in parent's children array. */
    currentIndex?: number;
  };

  // Code snippet properties
  /** Whether to enable syntax highlighting in code blocks. */
  codeSnippetHighlight?: boolean;
  /** Feedback text shown after copying. */
  codeSnippetFeedback?: string;
  /** Text for show less button. */
  codeSnippetShowLessText?: string;
  /** Text for show more button. */
  codeSnippetShowMoreText?: string;
  /** Tooltip text for copy button. */
  codeSnippetCopyButtonTooltipContent?: string;
  /** Function to get formatted line count text. */
  codeSnippetGetLineCountText?: ({ count }: { count: number }) => string;
  /** Aria-label for code snippets when in read-only mode. */
  codeSnippetAriaLabelReadOnly?: string;
  /** Aria-label for code snippets when in editable mode. */
  codeSnippetAriaLabelEditable?: string;

  // Table properties
  /** Placeholder text for table filter input. */
  tableFilterPlaceholderText?: string;
  /** Text for previous page button tooltip. */
  tablePreviousPageText?: string;
  /** Text for next page button tooltip. */
  tableNextPageText?: string;
  /** Text for items per page label. */
  tableItemsPerPageText?: string;
  /** The text used for the download button's accessible label. */
  tableDownloadLabelText?: string;
  /** Locale for table sorting and formatting. */
  tableLocale?: string;
  /** Function to get supplemental pagination text. */
  tableGetPaginationSupplementalText?: ({ count }: { count: number }) => string;
  /** Function to get pagination status text. */
  tableGetPaginationStatusText?: ({
    start,
    end,
    count,
  }: {
    start: number;
    end: number;
    count: number;
  }) => string;

  /**
   * Force markdown tables to render in loading mode. Useful for freezing
   * streaming table visuals until stream completion.
   */
  forceTableLoading?: boolean;

  /**
   * Consumer-supplied callbacks. Each key whose callback is present causes
   * the renderer to emit a named `<slot>` placeholder for that kind; the
   * callback itself is invoked later by the markdown element's `updated()`
   * lifecycle.
   */
  customRenderers?: MarkdownCustomRenderers;

  /**
   * The markdown-it instance that produced the current token tree. Required
   * for the unknown-token fallback (`md.renderer.render()` for
   * plugin-introduced tokens). When omitted, unknown tokens fall through to a
   * `<div>` default.
   */
  md?: MarkdownIt;

  /**
   * Internal hook used by the markdown element to collect descriptors during
   * a render pass; consumed by the `updated()` reconcile.
   *
   * @internal
   */
  recordCustomRender?: (descriptor: MarkdownRendererSlotDescriptor) => void;

  /**
   * Render-scoped sequence used to mint stable slot names for plugin-fallback
   * output. Reset at the top of each `renderMarkdownTree` call so the
   * counter restarts from zero per render pass; tokens at the same position
   * across renders receive the same slot name, enabling host reuse during
   * streaming.
   *
   * @internal
   */
  pluginSlotCounter?: { next: () => number };
}
