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
 * Argument passed to a markdown link (anchor) custom renderer callback. The
 * callback returns attribute overrides rather than a replacement element — the
 * framework still renders the `<a>` and its rich inline children, and still
 * applies the `target="_blank"` safety default unless the callback overrides
 * `target`.
 *
 * @category Messaging
 */
export interface MarkdownRendererLinkArgs {
  /** Resolved `href` of the link (may be a linkified bare URL). */
  href: string;
  /** The link's `title` attribute, when present. */
  title?: string;
  /**
   * Plain text of the link's rendered children, a convenience for
   * context-aware rewrites. The rich children render regardless of this value.
   */
  text: string;
  /** The link's parsed attributes (post-sanitize), as a plain object. */
  attributes: Record<string, string>;
  /** The markdown-it `link_open` `Token`. */
  token: Readonly<Token>;
  /** The full token-tree node, including descendants. */
  node: Readonly<TokenTree>;
}

/**
 * Attribute overrides returned by a {@link MarkdownCustomRenderers.link}
 * callback. Any field left `undefined` keeps the framework default; returning
 * `null` from the callback skips the override entirely.
 *
 * @category Messaging
 */
export interface MarkdownRendererLinkResult {
  /** Replacement `href`. */
  href?: string;
  /** Replacement `target` (e.g. `"_self"`). Overrides the `_blank` default. */
  target?: string;
  /** Replacement `rel`. */
  rel?: string;
  /**
   * Extra attributes merged over the link's existing ones. Re-sanitized when
   * the element has HTML sanitization enabled.
   */
  attributes?: Record<string, string>;
}

/**
 * Argument passed to a markdown image custom renderer callback. Like the link
 * callback it returns attribute overrides — the framework still renders the
 * `<img>`.
 *
 * @category Messaging
 */
export interface MarkdownRendererImageArgs {
  /** Resolved `src` of the image. */
  src: string;
  /** The image's `alt` text, when present. */
  alt?: string;
  /** The image's `title` attribute, when present. */
  title?: string;
  /** The image's parsed attributes (post-sanitize), as a plain object. */
  attributes: Record<string, string>;
  /** The markdown-it `image` `Token`. */
  token: Readonly<Token>;
  /** The full token-tree node. */
  node: Readonly<TokenTree>;
}

/**
 * Attribute overrides returned by a {@link MarkdownCustomRenderers.image}
 * callback. Fields left `undefined` keep the framework default; returning
 * `null` skips the override.
 *
 * @category Messaging
 */
export interface MarkdownRendererImageResult {
  /** Replacement `src`. */
  src?: string;
  /**
   * Extra attributes merged over the image's existing ones. Re-sanitized when
   * the element has HTML sanitization enabled.
   */
  attributes?: Record<string, string>;
}

/**
 * Identity + parsed state for one task-list checklist item, passed to the
 * {@link MarkdownRendererChecklist.getChecked} source-of-truth callback at
 * render time.
 *
 * @category Messaging
 */
export interface MarkdownRendererChecklistItemArgs {
  /**
   * Stable identity for the item — the source line of its list item. Stable
   * across re-renders while earlier lines don't shift.
   */
  id: string;
  /** The item's text. */
  label: string;
  /** The checkbox state parsed from the markdown (`[x]` / `[ ]`). */
  checked: boolean;
  /** The markdown-it checkbox `Token`. */
  token: Readonly<Token>;
  /** The full token-tree node. */
  node: Readonly<TokenTree>;
}

/**
 * Payload passed to {@link MarkdownRendererChecklist.onToggle} when a user
 * toggles a task-list checkbox. Carries the item identity and the new state.
 * The markdown-it token/node are intentionally omitted — they are not
 * available at DOM-event time; use {@link MarkdownRendererChecklistItemArgs}
 * (via `getChecked`) when you need them.
 *
 * @category Messaging
 */
export interface MarkdownRendererChecklistToggleArgs {
  /** Same identity as {@link MarkdownRendererChecklistItemArgs.id}. */
  id: string;
  /** The item's text. */
  label: string;
  /** The new checkbox state after the toggle. */
  checked: boolean;
}

/**
 * Behavior hook for task-list checkboxes. Unlike the other renderers it does
 * not replace any DOM — it makes the rendered `cds-checkbox` actionable so a
 * host can persist and react to checklist state.
 *
 * @category Messaging
 */
export interface MarkdownRendererChecklist {
  /**
   * Invoked when a task-list checkbox is toggled. Providing this callback is
   * what wires the checkboxes for interaction.
   */
  onToggle: (args: MarkdownRendererChecklistToggleArgs) => void;
  /**
   * Optional source-of-truth for the checked state, consulted on every render.
   * Return a boolean to override the markdown-parsed state (so a persisted
   * toggle survives streaming re-renders), or `undefined` to keep it.
   */
  getChecked?: (args: MarkdownRendererChecklistItemArgs) => boolean | undefined;
}

/**
 * Per-element custom renderer callbacks accepted by the markdown element.
 *
 * `table` and `codeBlock` are **element replacements**: the callback returns an
 * `HTMLElement` adopted as a light-DOM child (wrapped in a `<div slot="…">`
 * host so the consumer's element is not mutated) and projected through a named
 * shadow-DOM `<slot>`; return `null` to fall back to the default Carbon
 * rendering. `link` and `image` are **attribute transforms** — the framework
 * still renders the element and its children and returns overrides synchronously
 * (no slot host). `checklist` is a **behavior hook** that makes task-list
 * checkboxes actionable. External CSS continues to apply normally.
 *
 * @category Messaging
 */
export interface MarkdownCustomRenderers {
  /** Override the default `cds-aichat-table` rendering. */
  table?: (args: MarkdownRendererTableArgs) => HTMLElement | null;
  /** Override the default `cds-aichat-code-snippet` rendering. */
  codeBlock?: (args: MarkdownRendererCodeBlockArgs) => HTMLElement | null;
  /**
   * Transform how links render. Receives the parsed link data and returns
   * attribute overrides (`href`, `target`, `rel`, extra `attributes`), or
   * `null` to keep the defaults. The framework renders the `<a>` and its
   * children either way and keeps the `target="_blank"` safety default unless
   * overridden.
   */
  link?: (args: MarkdownRendererLinkArgs) => MarkdownRendererLinkResult | null;
  /**
   * Transform how images render. Receives the parsed image data and returns
   * attribute overrides (`src`, extra `attributes`), or `null` to keep the
   * defaults.
   */
  image?: (
    args: MarkdownRendererImageArgs,
  ) => MarkdownRendererImageResult | null;
  /**
   * Make task-list checkboxes actionable. See {@link MarkdownRendererChecklist}.
   */
  checklist?: MarkdownRendererChecklist;
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
   * Consumer-supplied callbacks. For `table`/`codeBlock` a present callback
   * causes the renderer to emit a named `<slot>` placeholder for that kind,
   * invoked later by the markdown element's `updated()` lifecycle. `link` and
   * `image` callbacks run synchronously during the render pass (attribute
   * transforms, no slot); `checklist` wires a toggle listener on the element.
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
