/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { TokenTree } from "../markdown-token-tree";

// HTML elements that never ship closing tags; treat them as self-closing so the stack logic does not wait for </tag>.
const SELF_CLOSING_HTML_TAGS = new Set<string>([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

// Token types we can safely glue into the combined HTML chunk. Anything else (e.g., emphasis markers) should abort
// the merge to avoid damaging markdown.
const INLINE_HTML_ALLOWED_TOKEN_TYPES = new Set<string>([
  "html_inline",
  "text",
  "softbreak",
  "hardbreak",
  "code_inline",
  "entity",
  "link_open",
  "link_close",
]);

type HtmlInlineTag =
  | { kind: "opening"; tagName: string; selfClosing: boolean }
  | { kind: "closing"; tagName: string };

type HtmlBlockBoundary =
  { kind: "opening"; tagName: string } | { kind: "closing"; tagName: string };

/** Marker element appended to opening HTML so markdown children mount inside the block. */
export const HTML_CONTAINER_SLOT = '<div data-aichat-markdown=""></div>';

// Detects html_block openers (e.g. "<div>\n<summary>…") that markdown-it split from
// their closing tag. Used by combineSplitHtmlBlocks to wrap later markdown siblings
// back inside the HTML element. Returns null for closers, self-closing tags, or blocks
// that already include a matching </tag>.
function parseHtmlBlockOpening(
  content: string | undefined,
): HtmlBlockBoundary | null {
  const trimmed = (content ?? "").trim();

  if (
    !trimmed.startsWith("<") ||
    trimmed.startsWith("</") ||
    trimmed.startsWith("<!") ||
    trimmed.startsWith("<?") ||
    trimmed.startsWith("<%")
  ) {
    return null;
  }

  const openingMatch = trimmed.match(/^<\s*([A-Za-z][\w:-]*)\b/);
  if (!openingMatch) {
    return null;
  }

  const tagName = openingMatch[1].toLowerCase();
  if (SELF_CLOSING_HTML_TAGS.has(tagName) || /\/>\s*$/.test(trimmed)) {
    return null;
  }

  const closePattern = new RegExp(`</\\s*${tagName}\\s*>`, "i");
  if (closePattern.test(trimmed)) {
    return null;
  }

  return { kind: "opening", tagName };
}

function parseHtmlBlockClosing(
  content: string | undefined,
): HtmlBlockBoundary | null {
  const trimmed = (content ?? "").trim();
  const closingMatch = trimmed.match(/^<\/\s*([A-Za-z][\w:-]*)\s*>$/);
  if (!closingMatch) {
    return null;
  }

  return { kind: "closing", tagName: closingMatch[1].toLowerCase() };
}

// Minimal tag parser that ignores comments/entities (e.g., <!-- ... -->) and reports whether a tag opens, closes, or
// self-closes a given element.
function parseHtmlInlineTag(content: string | undefined): HtmlInlineTag | null {
  const trimmed = (content ?? "").trim();

  if (!trimmed.startsWith("<") || !trimmed.endsWith(">")) {
    // Not bracketed like "<...>"; definitely not a tag token.
    return null;
  }

  if (trimmed.startsWith("</")) {
    // Closing tag: extract the element name. Reject malformed endings.
    const closingMatch = trimmed.match(/^<\/\s*([A-Za-z][\w:-]*)\s*>$/);
    if (!closingMatch) {
      return null;
    }
    return { kind: "closing", tagName: closingMatch[1].toLowerCase() };
  }

  // Skip comments/doctype/instruction fragments; they cannot help balance nesting.
  if (
    trimmed.startsWith("<!") ||
    trimmed.startsWith("<?") ||
    trimmed.startsWith("<%")
  ) {
    return null;
  }

  // Opening tag: grab the element name even if attributes trail after it.
  const openingMatch = trimmed.match(/^<\s*([A-Za-z][\w:-]*)\b[\s\S]*>$/);
  if (!openingMatch) {
    return null;
  }

  const tagName = openingMatch[1].toLowerCase();
  // Treat `<tag/>` and the HTML void elements as self-contained so they do not
  // add entries to the stack.
  const selfClosing =
    trimmed.endsWith("/>") || SELF_CLOSING_HTML_TAGS.has(tagName);

  return { kind: "opening", tagName, selfClosing };
}

// Collapses runs of html_inline tokens (possibly interleaved with text) into a
// single token so the browser does not auto-close the first tag mid-render.
export function combineConsecutiveHtmlInline(
  children: TokenTree[],
): TokenTree[] {
  if (children.length < 2) {
    return children;
  }

  const combinedChildren: TokenTree[] = [];
  let didCombine = false;

  for (let index = 0; index < children.length; index++) {
    const startNode = children[index];

    if (startNode.token.type !== "html_inline") {
      combinedChildren.push(startNode);
      continue;
    }

    const openingTag = parseHtmlInlineTag(startNode.token.content);
    if (
      !openingTag ||
      openingTag.kind !== "opening" ||
      openingTag.selfClosing
    ) {
      combinedChildren.push(startNode);
      continue;
    }

    const stack: string[] = [openingTag.tagName]; // Track nested openings we must close.
    const chunkTokens: TokenTree[] = [startNode]; // Collect tokens to merge if the stack clears.
    let content = startNode.token.content ?? "";
    let endIndex = index;
    let success = false;

    for (let lookahead = index + 1; lookahead < children.length; lookahead++) {
      const candidate = children[lookahead];
      const tokenType = candidate.token.type ?? "";

      if (!INLINE_HTML_ALLOWED_TOKEN_TYPES.has(tokenType)) {
        // Encountered formatting/inline constructs we do not know how to merge.
        break;
      }

      if (tokenType === "html_inline") {
        const parsed = parseHtmlInlineTag(candidate.token.content);
        if (!parsed) {
          // Malformed tag; abandon the merge.
          break;
        }

        chunkTokens.push(candidate);
        content += candidate.token.content ?? "";

        if (parsed.kind === "opening") {
          if (!parsed.selfClosing) {
            // Push nested openers so we wait for their matching closers too.
            stack.push(parsed.tagName);
          }
        } else {
          const expected = stack[stack.length - 1];
          if (expected !== parsed.tagName) {
            // Mismatched closing tag; bail before corrupting structure.
            break;
          }

          stack.pop();
          endIndex = lookahead;

          if (stack.length === 0) {
            // All openings matched; we can fuse the run.
            success = true;
            break;
          }
        }

        continue;
      }

      // Non-tag inline content (text, code, breaks, links) is safe to append.
      chunkTokens.push(candidate);
      content += serializeInlineToken(candidate);
    }

    if (!success) {
      // If we couldn't successfully combine, just add the original token and continue
      combinedChildren.push(startNode);
      continue;
    }

    if (stack.length === 0 && endIndex > index) {
      combinedChildren.push({
        key: chunkTokens.map((token) => token.key).join("|"),
        token: {
          ...startNode.token,
          content,
        },
        children: [],
      });
      index = endIndex; // Skip over tokens we already collapsed.
      didCombine = true;
      continue;
    }

    combinedChildren.push(startNode);
  }

  return didCombine ? combinedChildren : children;
}

// Wraps markdown block tokens that sit between a split html_block opener and
// closer so rendered content stays inside the HTML element (e.g. <details>).
export function combineSplitHtmlBlocks(children: TokenTree[]): TokenTree[] {
  if (children.length < 2) {
    return children;
  }

  const combinedChildren: TokenTree[] = [];
  let didCombine = false;

  for (let index = 0; index < children.length; index++) {
    const startNode = children[index];

    if (startNode.token.type !== "html_block") {
      combinedChildren.push(startNode);
      continue;
    }

    const openingTag = parseHtmlBlockOpening(startNode.token.content);
    if (!openingTag) {
      combinedChildren.push(startNode);
      continue;
    }

    const stack: string[] = [openingTag.tagName];
    const innerChildren: TokenTree[] = [];
    let endIndex = index;
    let closingHtml = "";
    let success = false;

    for (let lookahead = index + 1; lookahead < children.length; lookahead++) {
      const candidate = children[lookahead];

      if (candidate.token.type === "html_block") {
        const nestedClosing = parseHtmlBlockClosing(candidate.token.content);
        if (nestedClosing) {
          const expected = stack[stack.length - 1];
          if (expected !== nestedClosing.tagName) {
            break;
          }

          stack.pop();
          endIndex = lookahead;

          if (stack.length === 0) {
            closingHtml = candidate.token.content ?? "";
            success = true;
            break;
          }

          innerChildren.push(candidate);
          continue;
        }

        const nestedOpening = parseHtmlBlockOpening(candidate.token.content);
        if (nestedOpening) {
          stack.push(nestedOpening.tagName);
        }

        innerChildren.push(candidate);
        continue;
      }

      innerChildren.push(candidate);
    }

    if (!success || endIndex <= index) {
      combinedChildren.push(startNode);
      continue;
    }

    combinedChildren.push({
      key: [
        startNode.key,
        ...innerChildren.map((child) => child.key),
        children[endIndex].key,
      ].join("|"),
      token: {
        ...startNode.token,
        type: "html_container",
        tag: openingTag.tagName,
        meta: { closingHtml },
      },
      children: innerChildren,
    });
    index = endIndex;
    didCombine = true;
  }

  return didCombine ? combinedChildren : children;
}

function serializeInlineToken(tokenTree: TokenTree): string {
  const token = tokenTree.token;
  const type = token.type ?? "";

  if (
    type === "text" ||
    type === "code_inline" ||
    type === "softbreak" ||
    type === "hardbreak" ||
    type === "entity" ||
    type === "html_inline"
  ) {
    return token.content ?? "";
  }

  if (type === "link_open") {
    const attrs = (token.attrs ?? []) as Array<
      [string, string | null | undefined]
    >;
    const attrString = attrs
      .map(([name, value]) => {
        if (!name) {
          return "";
        }
        if (value === undefined || value === null) {
          return name;
        }
        const escaped = String(value).replace(/"/g, "&quot;");
        return `${name}="${escaped}"`;
      })
      .filter(Boolean)
      .join(" ");

    const childContent = (tokenTree.children ?? [])
      .map((child) => serializeInlineToken(child))
      .join("");

    const openTag = attrString.length ? `<a ${attrString}>` : "<a>";
    return `${openTag}${childContent}</a>`;
  }

  if (type === "link_close") {
    return "";
  }

  return token.content ?? "";
}
