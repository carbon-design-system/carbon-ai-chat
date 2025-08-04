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
import { type Token } from "markdown-it";

import { type TokenTree } from "./tokenTree";
import type { LocalizationOptions } from "../../../../../../types/localization/LocalizationOptions";

import "@carbon/web-components/es-custom/components/list/index.js";

import "../../../codeElement/cds-aichat-code";
import "../../../table/cds-aichat-table";

/**
 * Options for rendering a TokenTree
 */
export interface RenderTokenTreeOptions {
  /** Whether to sanitize HTML content */
  sanitize: boolean;

  /** Whether we're in streaming mode */
  streaming?: boolean;

  /** Context information for rendering */
  context?: {
    isInThead?: boolean;
    parentChildren?: TokenTree[];
    currentIndex?: number;
  };

  /** Localization options for markdown components */
  localization?: LocalizationOptions;

  /**
   * If child components like code or tables should be displayed in dark mode.
   */
  dark?: boolean;
}

// Static empty arrays to prevent re-renders during streaming from a new array being created over and over.
const EMPTY_HEADERS: string[] = [];
const EMPTY_TABLE_ROWS: { cells: string[] }[] = [];

// Static fallback functions for pagination text (used when no localization provided)
const DEFAULT_PAGINATION_SUPPLEMENTAL_TEXT = ({ count }: { count: number }) =>
  `${count} items`;
const DEFAULT_PAGINATION_STATUS_TEXT = ({
  start,
  end,
  count,
}: {
  start: number;
  end: number;
  count: number;
}) => `${start}–${end} of ${count} items`;

// Static empty attrs object to prevent re-renders
const EMPTY_ATTRS = {};

/**
 * Extracts table data from a table TokenTree node.
 * Converts the markdown table structure to the format expected by cds-aichat-table.
 *
 * @param tableNode - The table TokenTree node
 * @returns Object with headers and rows arrays
 */
function extractTableData(tableNode: TokenTree): {
  headers: string[];
  rows: string[][];
} {
  const headers: string[] = [];
  const rows: string[][] = [];

  for (const child of tableNode.children) {
    if (child.token.tag === "thead") {
      // Extract headers from thead
      for (const theadChild of child.children) {
        if (theadChild.token.tag === "tr") {
          for (const thChild of theadChild.children) {
            if (thChild.token.tag === "th") {
              // Get text content from th children
              const headerText = extractTextContent(thChild);
              headers.push(headerText);
            }
          }
        }
      }
    } else if (child.token.tag === "tbody") {
      // Extract rows from tbody
      for (const tbodyChild of child.children) {
        if (tbodyChild.token.tag === "tr") {
          const row: string[] = [];
          for (const tdChild of tbodyChild.children) {
            if (tdChild.token.tag === "td") {
              // Get text content from td children
              const cellText = extractTextContent(tdChild);
              row.push(cellText);
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
 * Recursively extracts text content from a TokenTree node.
 *
 * @param node - The TokenTree node
 * @returns The extracted text content
 */
function extractTextContent(node: TokenTree): string {
  if (node.token.type === "text") {
    return node.token.content;
  }

  if (node.token.type === "code_inline") {
    return node.token.content;
  }

  // For other node types, recursively extract text from children
  let text = "";
  for (const child of node.children) {
    text += extractTextContent(child);
  }

  return text;
}

/**
 * Recursively renders a TokenTree into a TemplateResult.
 *
 * This function handles the full translation from markdown it token trees into
 * Lit based HTML output. It supports both block-level and inline formatting,
 * sanitizes content if needed, and uses structural recursion to handle nesting.
 *
 * The function supports:
 * - Raw HTML embedding (with optional DOM sanitization)
 * - Text and code content
 * - Structural markdown elements (headings, lists, tables, etc.)
 * - Custom markdownit attributes (e.g. class, id, rel)
 * - Localized text for interactive components
 *
 * @param node - The TokenTree node to render
 * @param options - Rendering options
 * @returns A TemplateResult to insert in the DOM
 */
function renderTokenTree(
  node: TokenTree,
  options: RenderTokenTreeOptions
): TemplateResult {
  const { token, children } = node;
  const { context, dark, sanitize } = options;

  // Handle raw HTML (e.g., <iframe>, <video>, or custom elements like <my-widget>)
  // These are trusted HTML blocks or inlines that bypass regular markdown rendering.
  if (token.type === "html_block" || token.type === "html_inline") {
    const raw = token.content;

    // If sanitization is enabled, use DOMPurify to strip unsafe HTML.
    let content = raw;
    if (sanitize) {
      content = DOMPurify.sanitize(raw, {
        CUSTOM_ELEMENT_HANDLING: {
          tagNameCheck: () => true, // allow any custom element
          attributeNameCheck: () => true,
          allowCustomizedBuiltInElements: true,
        },
      });
    }
    return html`${unsafeHTML(content)}`;
  }

  // Text-only content (usually plain text in paragraphs or inline spans)
  if (token.type === "text") {
    return html`${token.content}`;
  }

  // Inline code blocks (e.g., `code`)
  if (token.type === "code_inline") {
    return html`<code>${token.content}</code>`;
  }

  // Fenced code blocks (e.g., ```js\nconsole.log('hello')\n```)
  if (token.type === "fence") {
    const language = token.info?.trim() ?? "";
    return html`<cds-aichat-code
      .language=${language}
      .content=${token.content}
      .dark=${dark}
    ></cds-aichat-code>`;
  }

  // Default case: token represents a structural element (e.g., <p>, <ul>, <h1>, etc.)

  // Resolve the HTML tag name from the token.
  const tag = token.tag;

  // Convert markdown-it attributes (array of [key, value]) into an object.
  const rawAttrs = (token.attrs || []).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  // If sanitizing, filter out any unsafe attributes (e.g., onclick, javascript: URLs).
  let attrs = rawAttrs;
  if (sanitize) {
    attrs = Object.fromEntries(
      Object.entries(rawAttrs).filter(([key, value]) => {
        const fragment = DOMPurify.sanitize(`<a ${key}="${value}">`, {
          RETURN_DOM: true,
        });
        const element = fragment.firstChild as Element | null;
        return element?.getAttribute(key) !== null;
      })
    );
  }

  // Set context for child elements based on current tag
  let childContext = context;
  if (tag === "thead") {
    childContext = { ...context, isInThead: true };
  }

  // Recursively render all child nodes into Lit TemplateResults.
  // For simple cases (single text child), render directly to avoid wrapper elements
  // Otherwise use `repeat()` to give Lit a stable `key` per child, minimizing DOM updates.
  let content: TemplateResult;

  if (children.length === 1 && children[0].token.type === "text") {
    // Single text child - render directly without repeat wrapper
    content = html`${children[0].token.content}`;
  } else {
    // Multiple children or complex content - use repeat for stability
    content = html`${repeat(
      children,
      (c, index) => {
        // Always use a consistent key format that doesn't depend on changing line positions
        // This prevents re-renders both during and after streaming
        const stableKey = `${index}:${c.token.type}:${c.token.tag}`;

        // For table-related tokens, use a special prefix to ensure they're handled correctly
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
            parentChildren: children,
            currentIndex: index,
          },
        })
    )}`;
  }

  // If token has no tag, just return the content without wrapping
  if (!tag) {
    return content;
  }

  // Use a static tag-based renderer to safely and predictably render known HTML tags.
  // Lit does not support dynamic tag names directly in the template syntax.
  return renderWithStaticTag(
    tag,
    token as Token,
    content,
    attrs,
    options,
    childContext,
    node
  );
}

/**
 * Renders a given HTML tag with its content and attributes.
 * All tag names must be static strings (per Lit rules).
 *
 * @param tag - The HTML tag or web component tag name.
 * @param token - The token object (for contextual rendering).
 * @param content - The content to go inside the element.
 * @param attrs - A sanitized record of attributes to spread.
 * @param options - Rendering options including streaming, context, and localization.
 * @param _context - Context information like whether we're in a thead.
 * @param _context.isInThead - Whether we're currently inside a thead element.
 * @param node - The current TokenTree node.
 * @returns A TemplateResult to insert in the DOM.
 */
function renderWithStaticTag(
  tag: string,
  token: Token,
  content: TemplateResult,
  attrs: Record<string, string>,
  options: RenderTokenTreeOptions,
  _context?: { isInThead?: boolean },
  node?: TokenTree
): TemplateResult {
  // Handle root token specially - don't wrap in any container element
  if (token.type === "root") {
    return content;
  }

  switch (tag) {
    case "p":
      return html`<p ...=${attrs}>${content}</p>`;

    case "ul": {
      const nested = token.level > 1;
      return html`<cds-custom-unordered-list ?nested=${nested} ...=${attrs}>
        ${content}
      </cds-custom-unordered-list>`;
    }

    case "ol": {
      const nested = token.level > 1;
      return html`<cds-custom-ordered-list ?nested=${nested} ...=${attrs}>
        ${content}
      </cds-custom-ordered-list>`;
    }

    case "li":
      return html`<cds-custom-list-item ...=${attrs}
        >${content}</cds-custom-list-item
      >`;

    case "h1":
      return html`<h1 ...=${attrs}>${content}</h1>`;

    case "h2":
      return html`<h2 ...=${attrs}>${content}</h2>`;

    case "h3":
      return html`<h3 ...=${attrs}>${content}</h3>`;

    case "h4":
      return html`<h4 ...=${attrs}>${content}</h4>`;

    case "h5":
      return html`<h5 ...=${attrs}>${content}</h5>`;

    case "h6":
      return html`<h6 ...=${attrs}>${content}</h6>`;

    case "blockquote":
      return html`<blockquote ...=${attrs}>${content}</blockquote>`;

    case "pre":
      return html`<pre ...=${attrs}>${content}</pre>`;

    case "code":
      return html`<code ...=${attrs}>${content}</code>`;

    case "strong":
      return html`<strong ...=${attrs}>${content}</strong>`;

    case "em":
      return html`<em ...=${attrs}>${content}</em>`;

    case "del":
      return html`<del ...=${attrs}>${content}</del>`;

    case "sub":
      return html`<sub ...=${attrs}>${content}</del>`;

    case "sup":
      return html`<sup ...=${attrs}>${content}</del>`;

    case "a":
      if (!attrs.target) {
        attrs.target = "_blank";
      }
      return html`<a ...=${attrs}>${content}</a>`;

    case "span":
      return html`<span ...=${attrs}>${content}</span>`;

    case "i":
      return html`<i ...=${attrs}>${content}</i>`;

    case "b":
      return html`<b ...=${attrs}>${content}</b>`;

    case "small":
      return html`<small ...=${attrs}>${content}</small>`;

    case "mark":
      return html`<mark ...=${attrs}>${content}</mark>`;

    case "ins":
      return html`<ins ...=${attrs}>${content}</ins>`;

    case "s":
      return html`<s ...=${attrs}>${content}</s>`;

    case "kbd":
      return html`<kbd ...=${attrs}>${content}</kbd>`;

    case "var":
      return html`<var ...=${attrs}>${content}</var>`;

    case "samp":
      return html`<samp ...=${attrs}>${content}</samp>`;

    case "cite":
      return html`<cite ...=${attrs}>${content}</cite>`;

    case "abbr":
      return html`<abbr ...=${attrs}>${content}</abbr>`;

    case "dfn":
      return html`<dfn ...=${attrs}>${content}</dfn>`;

    case "time":
      return html`<time ...=${attrs}>${content}</time>`;

    case "q":
      return html`<q ...=${attrs}>${content}</q>`;

    case "table": {
      // Extract table data from the token tree
      if (!node) {
        return html`<div>Error: Missing table data</div>`;
      }

      // Determine if we should show loading state when streaming
      // This happens when we're streaming and there are no nodes after this table
      const { streaming, context: parentContext, localization } = options;
      let isLoading = false;
      if (
        streaming &&
        parentContext?.parentChildren &&
        parentContext?.currentIndex !== undefined
      ) {
        const { parentChildren, currentIndex } = parentContext;
        // Check if this table is the last node or if there are no meaningful nodes after it
        const hasNodesAfterTable = currentIndex < parentChildren.length - 1;

        isLoading = !hasNodesAfterTable;
      }

      // If streaming and should show loading, use static empty data to avoid expensive extraction and re-renders
      let headers: string[];
      let tableRows: { cells: string[] }[];

      if (!isLoading) {
        // Only extract table data when not in loading state to avoid unnecessary computation
        const extractedData = extractTableData(node);
        headers = extractedData.headers;
        tableRows = extractedData.rows.map((row) => ({ cells: row }));
      } else {
        // Use static empty arrays to prevent re-renders during streaming
        headers = EMPTY_HEADERS;
        tableRows = EMPTY_TABLE_ROWS;
      }

      // Use cds-aichat-table which has built-in pagination and sorting
      // When loading, use static attrs to ensure complete stability
      const tableAttrs = isLoading ? EMPTY_ATTRS : attrs;

      // Get localization from props or use defaults
      const tableLocalization = localization?.table;

      return html`<div class="cds-aichat-table-holder">
        <cds-aichat-table
          .headers=${headers}
          .rows=${tableRows}
          .loading=${isLoading}
          .filterPlaceholderText=${tableLocalization?.filterPlaceholderText ||
          "Filter table..."}
          .previousPageText=${tableLocalization?.previousPageText ||
          "Previous page"}
          .nextPageText=${tableLocalization?.nextPageText || "Next page"}
          .itemsPerPageText=${tableLocalization?.itemsPerPageText ||
          "Items per page:"}
          .locale=${tableLocalization?.locale || "en"}
          .getPaginationSupplementalText=${tableLocalization?.getPaginationSupplementalText ||
          DEFAULT_PAGINATION_SUPPLEMENTAL_TEXT}
          .getPaginationStatusText=${tableLocalization?.getPaginationStatusText ||
          DEFAULT_PAGINATION_STATUS_TEXT}
          .dark=${options.dark}
          ...=${tableAttrs}
        ></cds-aichat-table>
      </div>`;
    }

    default:
      return html`<div ...=${attrs}>${content}</div>`;
  }
}

export { renderTokenTree };
