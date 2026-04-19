/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/*
 *  This file is based on markdown-it-attrs by Arve Seljebu
 *  Original repository: https://github.com/arve0/markdown-it-attrs
 *
 *  The MIT License (MIT)
 *
 *  Copyright (c) Arve Seljebu <arve.seljebu@gmail.com> (arve0.github.io)
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 *
 *  ---
 *
 *  This file has been rewritten for Carbon AI Chat to cover only the documented
 *  attribute syntax:
 *
 *    [link](url){{target=_blank rel=noopener}}
 *    # Heading {{id=foo}}
 *    Paragraph {{class=bar}}
 *
 *  Delimiters are fixed to `{{`/`}}` and only `target`, `rel`, `class`, `id`
 *  are applied; any other attribute key is silently dropped.
 */

import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type { Token } from "markdown-it";

const LEFT = "{{";
const RIGHT = "}}";
const ALLOWED = new Set(["target", "rel", "class", "id"]);

type AttrPair = [string, string];

/**
 * Parses the body between `{{` and `}}` into a list of allowed attribute pairs.
 * Supports `key=value` and `key="quoted value"`, space-separated. Disallowed
 * keys and malformed fragments are dropped silently.
 */
function parseAttrs(body: string): AttrPair[] {
  const attrs: AttrPair[] = [];
  let key = "";
  let value = "";
  let parsingKey = true;
  let inQuotes = false;

  const commit = () => {
    if (key !== "" && ALLOWED.has(key)) {
      attrs.push([key, value]);
    }
    key = "";
    value = "";
    parsingKey = true;
  };

  for (let i = 0; i < body.length; i++) {
    const ch = body.charAt(i);

    if (ch === "=" && parsingKey) {
      parsingKey = false;
      continue;
    }
    if (ch === '"' && !parsingKey) {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === " " && !inQuotes) {
      commit();
      continue;
    }
    if (parsingKey) {
      key += ch;
    } else {
      value += ch;
    }
  }
  commit();

  return attrs;
}

/**
 * Applies parsed attributes to a token, merging `class` with any pre-existing
 * class and pushing the rest.
 */
function applyAttrs(token: Token, attrs: AttrPair[]): void {
  for (const [key, value] of attrs) {
    if (key === "class") {
      token.attrJoin("class", value);
    } else {
      token.attrPush([key, value]);
    }
  }
}

/**
 * Walks backwards to find the `*_open` token matching the close token at
 * `closeIndex` (same level, matching type). Returns `null` when no match is
 * found, which causes the handler to silently bail.
 */
function findMatchingOpen(tokens: Token[], closeIndex: number): Token | null {
  const close = tokens[closeIndex];
  const openType = close.type.replace(/_close$/, "_open");
  for (let i = closeIndex - 1; i >= 0; i--) {
    if (tokens[i].type === openType && tokens[i].level === close.level) {
      return tokens[i];
    }
  }
  return null;
}

/**
 * Looks for a `*_close` child (e.g. `link_close`) immediately followed by a
 * text child starting with `{{…}}`. When matched, applies the attributes to
 * the matching opening token and rewrites/removes the text child. Returns
 * true if a mutation occurred so the caller can rescan for additional
 * link-attribute pairs on the same inline token.
 */
function handleInlineAttributes(inlineToken: Token): boolean {
  const children = inlineToken.children;
  if (!children) {
    return false;
  }

  for (let i = 1; i < children.length; i++) {
    const prev = children[i - 1];
    const curr = children[i];
    if (prev.nesting !== -1 || curr.type !== "text") {
      continue;
    }
    if (!curr.content.startsWith(LEFT)) {
      continue;
    }
    const closeIdx = curr.content.indexOf(RIGHT, LEFT.length);
    if (closeIdx === -1) {
      continue;
    }

    const openToken = findMatchingOpen(children, i - 1);
    if (!openToken) {
      continue;
    }

    const body = curr.content.slice(LEFT.length, closeIdx);
    applyAttrs(openToken, parseAttrs(body));

    const remainder = curr.content.slice(closeIdx + RIGHT.length);
    if (remainder.length === 0) {
      children.splice(i, 1);
    } else {
      curr.content = remainder;
    }
    return true;
  }

  return false;
}

/**
 * When the last text child of an `inline` token ends with `}}`, apply the
 * attributes to the matching block's opening token (heading_open /
 * paragraph_open / etc.) and strip them from the rendered text.
 */
function handleEndOfBlock(tokens: Token[], inlineIndex: number): void {
  const children = tokens[inlineIndex].children;
  if (!children || children.length === 0) {
    return;
  }
  const last = children[children.length - 1];
  if (last.type !== "text" || !last.content.endsWith(RIGHT)) {
    return;
  }
  const openIdx = last.content.lastIndexOf(LEFT);
  if (openIdx === -1) {
    return;
  }

  // Find the closing block token that follows this inline.
  let closeIdx = -1;
  for (let i = inlineIndex + 1; i < tokens.length; i++) {
    if (tokens[i].nesting === -1) {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) {
    return;
  }

  const openToken = findMatchingOpen(tokens, closeIdx);
  if (!openToken) {
    return;
  }

  const body = last.content.slice(
    openIdx + LEFT.length,
    last.content.length - RIGHT.length,
  );
  applyAttrs(openToken, parseAttrs(body));

  // Strip `{{…}}` and a single trailing space between the content and the
  // attribute block, so `# Heading {{id=foo}}` does not render as
  // `<h1>Heading </h1>`.
  let trimmed = last.content.slice(0, openIdx);
  if (trimmed.endsWith(" ")) {
    trimmed = trimmed.slice(0, -1);
  }
  last.content = trimmed;
}

/**
 * Markdown-it plugin that applies a fixed set of HTML attributes to links,
 * headings, and paragraphs using `{{key=value}}` syntax.
 */
export function markdownItAttrs(md: MarkdownIt): void {
  function curlyAttrs(state: StateCore): void {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "inline") {
        continue;
      }
      while (handleInlineAttributes(tokens[i])) {
        // Loop until no more link-attribute pairs remain on this inline token.
      }
      handleEndOfBlock(tokens, i);
    }
  }

  md.core.ruler.before("linkify", "curly_attributes", curlyAttrs);
}

export default markdownItAttrs;
