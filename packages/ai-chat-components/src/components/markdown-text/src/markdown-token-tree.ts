/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import MarkdownIt, { Token } from "markdown-it";

import { markdownItAttrs } from "./plugins/markdown-it-attrs";
import { markdownItHighlight } from "./plugins/markdown-it-highlight";
import { markdownItTaskLists } from "./plugins/markdown-it-task-lists";

/**
 * Represents a node in the token tree structure.
 */
export interface TokenTree {
  /** Unique identifier for this node, used for efficient diffing */
  key: string;
  /** The original markdown-it token data */
  token: Partial<Token>;
  /** Child nodes for nested content */
  children: TokenTree[];
}

/**
 * Pre-configured markdown-it instance that allows HTML content.
 * Uses CommonMark preset for GitHub Flavored Markdown compatibility.
 */
const htmlMarkdown = new MarkdownIt("commonmark", {
  html: true,
  breaks: true,
  linkify: true,
})
  .enable("table")
  .enable("strikethrough")
  .use(markdownItAttrs, {
    leftDelimiter: "{{",
    rightDelimiter: "}}",
    allowedAttributes: ["target", "rel", "class", "id"],
  })
  .use(markdownItHighlight)
  .use(markdownItTaskLists);

/**
 * Pre-configured markdown-it instance that strips HTML content.
 * Same features as htmlMarkdown but with HTML disabled for security.
 */
const noHtmlMarkdown = new MarkdownIt("commonmark", {
  html: false,
  breaks: true,
  linkify: true,
})
  .enable("table")
  .enable("strikethrough")
  .use(markdownItAttrs, {
    leftDelimiter: "{{",
    rightDelimiter: "}}",
    allowedAttributes: ["target", "rel", "class", "id"],
  })
  .use(markdownItHighlight)
  .use(markdownItTaskLists);

/**
 * Parses markdown text into a flat array of markdown-it tokens.
 */
export function markdownToMarkdownItTokens(
  fullText: string,
  allowHtml = true,
): Token[] {
  return allowHtml
    ? htmlMarkdown.parse(fullText, {})
    : noHtmlMarkdown.parse(fullText, {});
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
 * Converts a flat list of markdown-it tokens into a tree.
 */
export function buildTokenTree(tokens: Token[]): TokenTree {
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
 * Compares two TokenTree structures and creates a new tree that reuses
 * unchanged nodes from the old tree.
 *
 * This optimization is crucial for performance when content is being streamed
 * or updated incrementally.
 */
export function diffTokenTree(
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
export function markdownToTokenTree(
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
