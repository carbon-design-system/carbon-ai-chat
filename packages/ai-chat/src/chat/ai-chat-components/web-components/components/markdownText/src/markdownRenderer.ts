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

import { LocalizationOptions } from "../../../../../../types/localization/LocalizationOptions";
import "@carbon/web-components/es/components/list/index.js";
import "../../codeElement/cds-aichat-code";
import "../../table/cds-aichat-table";
import {
  DEFAULT_PAGINATION_STATUS_TEXT,
  DEFAULT_PAGINATION_SUPPLEMENTAL_TEXT,
  EMPTY_HEADERS,
  EMPTY_TABLE_ROWS,
  extractTableData,
} from "./utils/tableTokenHelpers";
import { combineConsecutiveHtmlInline } from "./utils/htmlInlineHelpers";
import type { TokenTree } from "./markdownTokenTree";

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

  /** Localization settings for interactive components */
  localization?: LocalizationOptions;

  /** Whether child components should use dark mode styling */
  dark?: boolean;
}

const EMPTY_ATTRS = {};

/**
 * Converts TokenTree to Lit TemplateResult.
 */
export function renderTokenTree(
  node: TokenTree,
  options: RenderTokenTreeOptions,
): TemplateResult {
  const { token, children } = node;
  const { context, dark, sanitize } = options;

  // Handle raw HTML blocks and inline HTML
  if (token.type === "html_block" || token.type === "html_inline") {
    let content = token.content;

    // Apply HTML sanitization if requested
    if (sanitize) {
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
    return html`<cds-aichat-code
      .language=${language}
      .content=${token.content}
      .dark=${dark}
    ></cds-aichat-code>`;
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
  if (sanitize) {
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
      return html`<cds-unordered-list ?nested=${nested} ${spread(attrs)}>
        ${content}
      </cds-unordered-list>`;
    }

    case "ol": {
      const nested = token.level > 1;
      return html`<cds-ordered-list ?nested=${nested} ${spread(attrs)}>
        ${content}
      </cds-ordered-list>`;
    }

    case "li":
      return html`<cds-list-item ${spread(attrs)}>${content}</cds-list-item>`;

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

      const { streaming, context: parentContext, localization } = options;

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

      // Extract table data or use empty placeholders for loading state
      let headers: string[];
      let tableRows: { cells: string[] }[];

      if (!isLoading) {
        const extractedData = extractTableData(node);
        headers = extractedData.headers;
        tableRows = extractedData.rows.map((row) => ({ cells: row }));
      } else {
        // Use static empty arrays to prevent re-renders during streaming
        headers = EMPTY_HEADERS;
        tableRows = EMPTY_TABLE_ROWS;
      }

      const tableAttrs = isLoading ? EMPTY_ATTRS : attrs;
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
          ...=${tableAttrs}
        ></cds-aichat-table>
      </div>`;
    }

    // Fallback for unknown tags
    default:
      return html`<div ${spread(attrs)}>${content}</div>`;
  }
}
