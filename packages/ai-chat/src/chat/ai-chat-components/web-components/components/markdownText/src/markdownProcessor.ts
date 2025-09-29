/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains the complete pipeline for processing markdown text from input
 * to rendered HTML output. The processing flow is:
 *
 * Raw markdown -> flat list of markdown-it tokens -> flat list to tree -> diffing any previous tree and adding keys for Lit -> processing by Lit.
 */

import DOMPurify from "dompurify";
import { html, TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import MarkdownIt, { Token } from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import { markdownItHighlight } from "./plugins/markdownItHighlight";

import { LocalizationOptions } from "../../../../../../types/localization/LocalizationOptions";
import "@carbon/web-components/es/components/list/index.js";
import "../../codeElement/cds-aichat-code";
import "../../table/cds-aichat-table";

/**
 * Represents a node in the token tree structure.
 */
interface TokenTree {
  /** Unique identifier for this node, used for efficient diffing */
  key: string;
  /** The original markdown-it token data */
  token: Partial<Token>;
  /** Child nodes for nested content */
  children: TokenTree[];
}

/**
 * Configuration options for rendering TokenTrees into HTML.
 */
interface RenderTokenTreeOptions {
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

/**
 * Pre-configured markdown-it instance that allows HTML content.
 */
const htmlMarkdown = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})
  .use(markdownItAttrs, {
    leftDelimiter: "{{",
    rightDelimiter: "}}",
    allowedAttributes: ["target", "rel", "class", "id"],
  })
  .use(markdownItHighlight);

/**
 * Pre-configured markdown-it instance that strips HTML content.
 * Same features as htmlMarkdown but with HTML disabled for security.
 */
const noHtmlMarkdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})
  .use(markdownItAttrs, {
    leftDelimiter: "{{",
    rightDelimiter: "}}",
    allowedAttributes: ["target", "rel", "class", "id"],
  })
  .use(markdownItHighlight);

/**
 * Parses markdown text into a flat array of markdown-it tokens.
 */
function markdownToMarkdownItTokens(
  fullText: string,
  allowHtml = true,
): Token[] {
  return allowHtml
    ? htmlMarkdown.parse(fullText, {})
    : noHtmlMarkdown.parse(fullText, {});
}

/**
 * Converts a flat list of markdown-it tokens into a tree.
 */
function buildTokenTree(tokens: Token[]): TokenTree {
  // Create the root node that will contain all top-level content
  const root: TokenTree = {
    key: "root",
    token: {
      type: "root",
      tag: "",
      nesting: 0,
      level: 0,
      content: "",
      attrs: null,
      children: null,
      markup: "",
      block: true,
      hidden: false,
      map: null,
      info: "",
      meta: null,
    },
    children: [],
  };

  // Stack tracks the current nesting context while building the tree
  const stack: TokenTree[] = [root];

  tokens.forEach((token) => {
    // Create a new node for this token
    const node: TokenTree = {
      key: generateKey(token),
      token,
      children: [],
    };

    // Handle inline tokens that contain their own child tokens
    // (e.g., a paragraph containing bold, italic, and text tokens)
    if (token.type === "inline" && token.children?.length) {
      node.children = buildTokenTree(token.children).children;
    }

    const current = stack[stack.length - 1];

    if (token.nesting === 1) {
      // Opening tag: add node to current container and descend into it
      current.children.push(node);
      stack.push(node);
    } else if (token.nesting === -1) {
      // Closing tag: exit current container
      stack.pop();
    } else {
      // Self-contained token: add to current container
      current.children.push(node);
    }
  });

  return root;
}

/**
 * Generates a unique string key for a markdown-it token.
 *
 * The key combines the token type, HTML tag, and source position to create
 * a stable identifier that can be used by Lit's repeat() directive for
 * efficient DOM updates.
 */
function generateKey(token: Token): string {
  const map = token.map ? token.map.join("-") : "";
  return `${token.type}:${token.tag}:${map}`;
}

/**
 * Compares two TokenTree structures and creates a new tree that reuses
 * unchanged nodes from the old tree.
 *
 * This optimization is crucial for performance when content is being streamed
 * or updated incrementally.
 */
function diffTokenTree(
  oldTree: TokenTree | undefined,
  newTree: TokenTree,
): TokenTree {
  // If keys don't match, the entire subtree changed - use new tree
  if (!oldTree || oldTree.key !== newTree.key) {
    return newTree;
  }

  // Keys match so create merged tree reusing unchanged children
  const merged: TokenTree = {
    key: newTree.key,
    token: newTree.token,
    children: [],
  };

  // Create lookup map of old children by key for efficient comparison
  const oldChildrenByKey = new Map(
    oldTree.children.map((child) => [child.key, child]),
  );

  // Process each new child, reusing old ones where possible
  newTree.children.forEach((newChild) => {
    const oldChild = oldChildrenByKey.get(newChild.key);

    if (oldChild) {
      // Recursively diff matching children
      merged.children.push(diffTokenTree(oldChild, newChild));
    } else {
      // Use new child as-is
      merged.children.push(newChild);
    }
  });

  return merged;
}

/**
 * Converts markdown into a tree with keys on it for Lit.
 */
function markdownToTokenTree(
  markdown: string,
  lastTree?: TokenTree,
  allowHtml = true,
): TokenTree {
  // Parse markdown into flat token array
  const tokens = markdownToMarkdownItTokens(markdown, allowHtml);

  // Build hierarchical tree structure
  const tree = buildTokenTree(tokens);

  // Optimize by reusing unchanged parts of previous tree
  return diffTokenTree(lastTree, tree);
}

// Static constants to provide the table component when we are just showing the skeleton.
const EMPTY_HEADERS: string[] = [];
const EMPTY_TABLE_ROWS: { cells: string[] }[] = [];
const EMPTY_ATTRS = {};

// Default localization functions for table pagination
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

/**
 * Extracts tabular data from a table TokenTree node.
 *
 * Converts the hierarchical markdown table structure into the flat
 * header/rows format expected by the cds-aichat-table component.
 *
 * I think we can probably get rid of all this when we move to using native carbon table web components.
 */
function extractTableData(tableNode: TokenTree): {
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
function extractTextContent(node: TokenTree): string {
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

/**
 * Fixes broken standalone HTML tags like <b>bold</b>.
 *
 * Problem: markdown-it splits '<b>bold</b>' into 3 tokens: [<b>, bold, </b>]
 * These render as separate Lit template parts: html`${<b>}${bold}${</b>}`
 * Lit processes each ${} independently, creating: <b></b>bold</b>
 *
 * Solution: Combine matching tokens into single template part: html`${<b>bold</b>}`
 *
 * Only handles exact pattern: html_inline + text + html_inline with matching tags.
 */
function tryToCombineConsecutiveHtmlInline(
  children: TokenTree[],
): string | null {
  // Only handle the exact pattern: html_inline + text + html_inline
  if (children.length !== 3) {
    return null;
  }

  const [first, second, third] = children;

  // Check if we have the exact pattern
  if (
    first.token.type === "html_inline" &&
    second.token.type === "text" &&
    third.token.type === "html_inline"
  ) {
    const openingTag = first.token.content || "";
    const textContent = second.token.content || "";
    const closingTag = third.token.content || "";

    // Verify opening tag pattern: <tagname> or <tagname attr="value">
    const openingMatch = openingTag.match(/^<([a-zA-Z][a-zA-Z0-9]*)[^>]*>$/);
    if (!openingMatch) {
      return null;
    }

    const tagName = openingMatch[1];

    // Verify closing tag matches: </tagname>
    if (closingTag !== `</${tagName}>`) {
      return null;
    }

    // Combine into complete HTML element
    return openingTag + textContent + closingTag;
  }

  return null;
}

/**
 * Converts TokenTree to Lit TemplateResult.
 */
function renderTokenTree(
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
    // Check if we have a simple case of consecutive html_inline + text + html_inline
    // that forms a complete HTML element (e.g., <b>bold</b>)
    const combinedContent = tryToCombineConsecutiveHtmlInline(children);

    if (combinedContent) {
      // Render the combined HTML content directly
      content = html`${unsafeHTML(combinedContent)}`;
    } else {
      // Multiple or complex children: use repeat for stable keying
      content = html`${repeat(
        children,
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
              parentChildren: children,
              currentIndex: index,
            },
          }),
      )}`;
    }
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
      return html`<p ...=${attrs}>${content}</p>`;

    case "blockquote":
      return html`<blockquote ...=${attrs}>${content}</blockquote>`;

    case "pre":
      return html`<pre ...=${attrs}>${content}</pre>`;

    // Headings
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

    // Lists with Carbon components
    case "ul": {
      const nested = token.level > 1;
      return html`<cds-unordered-list ?nested=${nested} ...=${attrs}>
        ${content}
      </cds-unordered-list>`;
    }

    case "ol": {
      const nested = token.level > 1;
      return html`<cds-ordered-list ?nested=${nested} ...=${attrs}>
        ${content}
      </cds-ordered-list>`;
    }

    case "li":
      return html`<cds-list-item ...=${attrs}>${content}</cds-list-item>`;

    // Inline formatting
    case "strong":
      return html`<strong ...=${attrs}>${content}</strong>`;
    case "em":
      return html`<em ...=${attrs}>${content}</em>`;
    case "code":
      return html`<code ...=${attrs}>${content}</code>`;
    case "del":
      return html`<del ...=${attrs}>${content}</del>`;
    case "sub":
      return html`<sub ...=${attrs}>${content}</sub>`;
    case "sup":
      return html`<sup ...=${attrs}>${content}</sup>`;
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

    // Links with automatic target="_blank"
    case "a":
      if (!attrs.target) {
        attrs.target = "_blank";
      }
      return html`<a ...=${attrs}>${content}</a>`;

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
      return html`<div ...=${attrs}>${content}</div>`;
  }
}

export {
  type TokenTree,
  type RenderTokenTreeOptions,
  markdownToMarkdownItTokens,
  markdownToTokenTree,
  renderTokenTree,
  buildTokenTree,
  diffTokenTree,
};
