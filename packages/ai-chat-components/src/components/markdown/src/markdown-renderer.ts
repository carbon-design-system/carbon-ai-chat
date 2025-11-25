/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import DOMPurify from "dompurify";
import { html, TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { nothing } from "lit";
import { Directive, directive } from "lit/directive.js";
import { Token } from "markdown-it";
import "@carbon/web-components/es/components/list/index.js";
import "@carbon/web-components/es/components/checkbox/index.js";
import "../../code-snippet/index.js";
import "../../table/index.js";

import type {
  TableCellContent,
  TableRowContent,
} from "../../table/src/cds-aichat-table.js";
import {
  DEFAULT_PAGINATION_STATUS_TEXT,
  DEFAULT_PAGINATION_SUPPLEMENTAL_TEXT,
  extractTableData,
} from "./utils/table-helpers.js";
import type { TableCellData } from "./utils/table-helpers.js";
import { combineConsecutiveHtmlInline } from "./utils/html-helpers.js";
import type { TokenTree } from "./markdown-token-tree.js";

// Generic attribute spread for Lit templates
class SpreadAttrs extends Directive {
  render(_attrs: Record<string, unknown>) {
    return nothing;
  }
  update(part: any, [attrs]: [Record<string, unknown>]) {
    const el = part.element as Element;
    for (const [k, v] of Object.entries(attrs ?? {})) {
      if (v === false || v === null || v === undefined) {
        el.removeAttribute(k);
      } else if (v === true) {
        el.setAttribute(k, "");
      } else {
        el.setAttribute(k, String(v));
      }
    }
    return nothing;
  }
}
const spread = directive(SpreadAttrs);

/**
 * Configuration options for rendering TokenTrees into HTML.
 */
export interface RenderTokenTreeOptions {
  /** Whether to sanitize HTML content using DOMPurify */
  sanitize: boolean;

  /** Whether content is being streamed (affects loading states) */
  streaming?: boolean;

  /** Context information for nested rendering */
  context?: {
    /** Whether we're currently inside a table header */
    isInThead?: boolean;
    /** All children of the parent node */
    parentChildren?: TokenTree[];
    /** Current index in parent's children array */
    currentIndex?: number;
  };

  /** Whether to enable syntax highlighting in code blocks */
  highlight?: boolean;

  // Table strings
  /** Placeholder text for table filter input */
  filterPlaceholderText?: string;
  /** Text for previous page button tooltip */
  previousPageText?: string;
  /** Text for next page button tooltip */
  nextPageText?: string;
  /** Text for items per page label */
  itemsPerPageText?: string;
  /** Locale for table sorting and formatting */
  locale?: string;
  /** Function to get supplemental pagination text */
  getPaginationSupplementalText?: ({ count }: { count: number }) => string;
  /** Function to get pagination status text */
  getPaginationStatusText?: ({
    start,
    end,
    count,
  }: {
    start: number;
    end: number;
    count: number;
  }) => string;

  // Code snippet strings
  /** Feedback text shown after copying */
  feedback?: string;
  /** Text for show less button */
  showLessText?: string;
  /** Text for show more button */
  showMoreText?: string;
  /** Tooltip text for copy button */
  tooltipContent?: string;
  /** Function to get formatted line count text */
  getLineCountText?: ({ count }: { count: number }) => string;
}

const EMPTY_ATTRS = {};
const EMPTY_TABLE_HEADERS: TableCellContent[] = [];
const EMPTY_TABLE_ROWS: TableRowContent[] = [];

/**
 * Converts TokenTree to Lit TemplateResult.
 */
export function renderTokenTree(
  node: TokenTree,
  options: RenderTokenTreeOptions,
): TemplateResult {
  const { token, children } = node;
  const { context, sanitize } = options;

  // Handle raw HTML blocks and inline HTML
  if (token.type === "html_block" || token.type === "html_inline") {
    let content = token.content || "";

    // Apply HTML sanitization if requested
    if (sanitize && content) {
      content = DOMPurify.sanitize(content, {
        CUSTOM_ELEMENT_HANDLING: {
          tagNameCheck: () => true, // Allow custom elements
          attributeNameCheck: () => true,
          allowCustomizedBuiltInElements: true,
        },
      });
    }

    return html`${unsafeHTML(content)}`;
  }

  // Handle plain text content
  if (token.type === "text") {
    return html`${token.content}`;
  }

  // Handle inline code spans
  if (token.type === "code_inline") {
    return html`<code>${token.content}</code>`;
  }

  // Handle fenced code blocks
  if (token.type === "fence") {
    const language = token.info?.trim() ?? "";
    const {
      highlight = true,
      feedback,
      showLessText,
      showMoreText,
      tooltipContent,
      getLineCountText,
    } = options;

    return html`<cds-aichat-code-snippet-tile-container
      .language=${language}
      .highlight=${highlight}
      .feedback=${feedback}
      .showLessText=${showLessText}
      .showMoreText=${showMoreText}
      .tooltipContent=${tooltipContent}
      .getLineCountText=${getLineCountText}
      >${token.content}</cds-aichat-code-snippet-tile-container
    >`;
  }

  // Handle structural elements (paragraphs, headings, lists, etc.)
  const tag = token.tag;

  // Convert markdown-it attributes (array of [key, value]) into an object.
  const rawAttrs = (token.attrs || []).reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );

  // Apply attribute sanitization if requested
  let attrs = rawAttrs;
  const isCustomElement = !!token.tag && token.tag.includes("-");
  if (sanitize && !isCustomElement) {
    attrs = Object.fromEntries(
      Object.entries(rawAttrs).filter(([key, value]) => {
        // Use DOMPurify to check if attribute is safe
        const fragment = DOMPurify.sanitize(`<a ${key}="${value}">`, {
          RETURN_DOM: true,
        });
        const element = fragment.firstChild as Element | null;
        return element?.getAttribute(key) !== null;
      }),
    );
  }

  // Set up context for child rendering
  let childContext = context;
  if (tag === "thead") {
    childContext = { ...context, isInThead: true };
  }

  // Render child content
  let content: TemplateResult;

  if (children.length === 1 && children[0].token.type === "text") {
    // Optimization: single text child doesn't need repeat wrapper
    content = html`${children[0].token.content}`;
  } else {
    const normalizedChildren = combineConsecutiveHtmlInline(children);

    // Multiple or complex children: use repeat for stable keying
    content = html`${repeat(
      normalizedChildren,
      (c, index) => {
        // Generate stable key that doesn't depend on line positions
        // This prevents unnecessary re-renders during streaming
        const stableKey = `${index}:${c.token.type}:${c.token.tag}`;

        if (c.token.type?.includes("table")) {
          return `table-${stableKey}`;
        }

        return `stable-${stableKey}`;
      },
      (c, index) =>
        renderTokenTree(c, {
          ...options,
          context: {
            ...childContext,
            parentChildren: normalizedChildren,
            currentIndex: index,
          },
        }),
    )}`;
  }

  // Handle tokens without HTML tags (just return content)
  if (!tag) {
    return content;
  }

  // Render the final HTML element with appropriate tag
  return renderWithStaticTag(
    tag,
    token as Token,
    content,
    attrs,
    options,
    childContext,
    node,
  );
}

/**
 * Renders HTML elements with static tag names.
 */
function renderWithStaticTag(
  tag: string,
  token: Token,
  content: TemplateResult,
  attrs: Record<string, string>,
  options: RenderTokenTreeOptions,
  _context?: { isInThead?: boolean },
  node?: TokenTree,
): TemplateResult {
  // Handle root token specially
  if (token.type === "root") {
    return content;
  }

  const hasTaskListItems = (listNode?: TokenTree) =>
    !!listNode?.children?.some((child) => {
      if (child.token.type !== "list_item_open") {
        return false;
      }

      const classAttr = child.token.attrs?.find(([key]) => key === "class");
      return classAttr?.[1]?.split(/\s+/).includes("task-list-item");
    });

  switch (tag) {
    // Basic block elements
    case "p":
      return html`<p ${spread(attrs)}>${content}</p>`;

    case "blockquote":
      return html`<blockquote ${spread(attrs)}>${content}</blockquote>`;

    case "pre":
      return html`<pre ${spread(attrs)}>${content}</pre>`;

    // Headings
    case "h1":
      return html`<h1 ${spread(attrs)}>${content}</h1>`;
    case "h2":
      return html`<h2 ${spread(attrs)}>${content}</h2>`;
    case "h3":
      return html`<h3 ${spread(attrs)}>${content}</h3>`;
    case "h4":
      return html`<h4 ${spread(attrs)}>${content}</h4>`;
    case "h5":
      return html`<h5 ${spread(attrs)}>${content}</h5>`;
    case "h6":
      return html`<h6 ${spread(attrs)}>${content}</h6>`;

    // Lists with Carbon components
    case "ul": {
      const nested = token.level > 1;
      if (hasTaskListItems(node)) {
        return html`<ul ${spread(attrs)}>
          ${content}
        </ul>`;
      }
      return html`<cds-unordered-list ?nested=${nested} ${spread(attrs)}>
        ${content}
      </cds-unordered-list>`;
    }

    case "ol": {
      const nested = token.level > 1;
      if (hasTaskListItems(node)) {
        return html`<ol ${spread(attrs)}>
          ${content}
        </ol>`;
      }
      return html`<cds-ordered-list native ?nested=${nested} ${spread(attrs)}>
        ${content}
      </cds-ordered-list>`;
    }

    case "li": {
      const classList = attrs.class?.split(/\s+/) ?? [];
      if (classList.includes("task-list-item")) {
        return html`<li ${spread(attrs)}>${content}</li>`;
      }
      return html`<cds-list-item ${spread(attrs)}>${content}</cds-list-item>`;
    }

    case "cds-checkbox": {
      const { checked, disabled, ...otherAttrs } = attrs;
      const isChecked = checked === "true";
      const isDisabled =
        disabled === undefined ? true : disabled === "" || disabled === "true";

      return html`<cds-checkbox
        ?checked=${isChecked}
        ?disabled=${isDisabled}
        ${spread(otherAttrs)}
        >${content}</cds-checkbox
      >`;
    }

    // Inline formatting
    case "strong":
      return html`<strong ${spread(attrs)}>${content}</strong>`;
    case "em":
      return html`<em ${spread(attrs)}>${content}</em>`;
    case "code":
      return html`<code ${spread(attrs)}>${content}</code>`;
    case "del":
      return html`<del ${spread(attrs)}>${content}</del>`;
    case "sub":
      return html`<sub ${spread(attrs)}>${content}</sub>`;
    case "sup":
      return html`<sup ${spread(attrs)}>${content}</sup>`;
    case "span":
      return html`<span ${spread(attrs)}>${content}</span>`;
    case "i":
      return html`<i ${spread(attrs)}>${content}</i>`;
    case "b":
      return html`<b ${spread(attrs)}>${content}</b>`;
    case "small":
      return html`<small ${spread(attrs)}>${content}</small>`;
    case "mark":
      return html`<mark ${spread(attrs)}>${content}</mark>`;
    case "ins":
      return html`<ins ${spread(attrs)}>${content}</ins>`;
    case "s":
      return html`<s ${spread(attrs)}>${content}</s>`;
    case "kbd":
      return html`<kbd ${spread(attrs)}>${content}</kbd>`;
    case "var":
      return html`<var ${spread(attrs)}>${content}</var>`;
    case "samp":
      return html`<samp ${spread(attrs)}>${content}</samp>`;
    case "cite":
      return html`<cite ${spread(attrs)}>${content}</cite>`;
    case "abbr":
      return html`<abbr ${spread(attrs)}>${content}</abbr>`;
    case "dfn":
      return html`<dfn ${spread(attrs)}>${content}</dfn>`;
    case "time":
      return html`<time ${spread(attrs)}>${content}</time>`;
    case "q":
      return html`<q ${spread(attrs)}>${content}</q>`;

    // Links with automatic target="_blank"
    case "a":
      if (!attrs.target) {
        attrs.target = "_blank";
      }
      return html`<a ${spread(attrs)}>${content}</a>`;

    // Tables with Carbon component and streaming support
    case "table": {
      if (!node) {
        return html`<div>Error: Missing table data</div>`;
      }

      const {
        streaming,
        context: parentContext,
        filterPlaceholderText,
        previousPageText,
        nextPageText,
        itemsPerPageText,
        locale,
        getPaginationSupplementalText,
        getPaginationStatusText,
      } = options;

      // Determine if we should show loading state during streaming
      let isLoading = false;
      if (
        streaming &&
        parentContext?.parentChildren &&
        parentContext?.currentIndex !== undefined
      ) {
        const { parentChildren, currentIndex } = parentContext;
        const hasNodesAfterTable = currentIndex < parentChildren.length - 1;
        isLoading = !hasNodesAfterTable;
      }

      const renderCellTokens = (tokens: TokenTree[], contextOverrides = {}) =>
        html`${repeat(
          tokens,
          (child, index) =>
            `cell-${index}:${child.token.type}:${child.token.tag}`,
          (child, index) =>
            renderTokenTree(child, {
              ...options,
              context: {
                ...options.context,
                ...contextOverrides,
                parentChildren: tokens,
                currentIndex: index,
              },
            }),
        )}`;

      const createCellContent = (
        cell: TableCellData,
        contextOverrides?: Record<string, unknown>,
      ): TableCellContent => ({
        text: cell.text,
        template: cell.tokens
          ? renderCellTokens(cell.tokens, contextOverrides)
          : null,
      });

      // Extract table data or use empty placeholders for loading state
      let headers: TableCellContent[];
      let tableRows: TableRowContent[];

      if (!isLoading) {
        const extractedData = extractTableData(node);

        headers = extractedData.headers.map((cell) =>
          createCellContent(cell, { isInThead: true }),
        );

        tableRows = extractedData.rows.map((row) => ({
          cells: row.map((cell) => createCellContent(cell)),
        }));
      } else {
        // Use static empty arrays to prevent re-renders during streaming
        headers = EMPTY_TABLE_HEADERS;
        tableRows = EMPTY_TABLE_ROWS;
      }

      const tableAttrs = isLoading ? EMPTY_ATTRS : attrs;

      return html`<div class="cds-aichat-table-holder">
        <cds-aichat-table
          .headers=${headers}
          .rows=${tableRows}
          .loading=${isLoading}
          .filterPlaceholderText=${filterPlaceholderText || "Filter table..."}
          .previousPageText=${previousPageText || "Previous page"}
          .nextPageText=${nextPageText || "Next page"}
          .itemsPerPageText=${itemsPerPageText || "Items per page:"}
          .locale=${locale || "en"}
          .getPaginationSupplementalText=${getPaginationSupplementalText ||
          DEFAULT_PAGINATION_SUPPLEMENTAL_TEXT}
          .getPaginationStatusText=${getPaginationStatusText ||
          DEFAULT_PAGINATION_STATUS_TEXT}
          ...=${tableAttrs}
        ></cds-aichat-table>
      </div>`;
    }

    // Fallback for unknown tags
    default:
      return html`<div ${spread(attrs)}>${content}</div>`;
  }
}
