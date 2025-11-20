/*
 *  Copyright IBM Corp. 2025
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
      return combinedChildren;
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
