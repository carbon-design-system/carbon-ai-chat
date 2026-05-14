/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Inline-level markdown renderer used by `MessageRichUserContent` when a
 * paragraph mixes plain text with chips or custom nodes. We can't reuse the
 * block-level `<cds-aichat-markdown>` here because that wraps its output in
 * `<div>` / `<p>` and renders Carbon components for code fences, tables, etc.
 * The chip-bearing path needs a flat React fragment that nests inside an
 * existing `<p>`, so this helper walks only inline markdown-it tokens
 * (`strong`, `em`, `code_inline`, `link`, `s`, `==mark==`, etc.) and emits
 * the matching React elements. HTML is stripped (we pass `removeHTML` to the
 * tokenizer).
 */

import React, { Fragment, type ReactNode } from "react";
import type { Token } from "markdown-it";

import { markdownToMarkdownItTokens } from "@carbon/ai-chat-components/es/globals/utils/markdown/index.js";

/**
 * Render a single line / paragraph of inline markdown into React children.
 * Block-level constructs (headings, lists, fences, tables) are not honored —
 * pass the text one paragraph at a time and let the caller wrap each result
 * in its own `<p>`.
 */
export function renderInlineMarkdown(text: string): ReactNode {
  if (!text) {
    return null;
  }

  const tokens = markdownToMarkdownItTokens(text, false);

  // The block parser will have wrapped our text in a paragraph. Find the
  // `inline` token's children — those are the actual inline tokens we care
  // about. Fall back to the whole token stream if no inline wrapper exists
  // (e.g. caller passed something the parser couldn't parse).
  const inlineToken = tokens.find((token) => token.type === "inline");
  const inlineTokens = inlineToken?.children ?? tokens;

  return renderInlineTokenList(inlineTokens);
}

interface InlineFrame {
  type: "strong" | "em" | "s" | "a" | "mark";
  attrs: Record<string, string>;
  children: ReactNode[];
}

function renderInlineTokenList(tokens: Token[] | null): ReactNode {
  if (!tokens?.length) {
    return null;
  }

  const root: ReactNode[] = [];
  const stack: InlineFrame[] = [];
  const pushChild = (child: ReactNode) => {
    const target = stack.length ? stack[stack.length - 1].children : root;
    target.push(child);
  };

  let keyCounter = 0;
  const nextKey = () => `i-${keyCounter++}`;

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        if (token.content) {
          pushChild(<Fragment key={nextKey()}>{token.content}</Fragment>);
        }
        break;

      case "code_inline":
        pushChild(<code key={nextKey()}>{token.content}</code>);
        break;

      case "softbreak":
        pushChild(<Fragment key={nextKey()}> </Fragment>);
        break;

      case "hardbreak":
        pushChild(<br key={nextKey()} />);
        break;

      case "strong_open":
        stack.push({ type: "strong", attrs: {}, children: [] });
        break;
      case "em_open":
        stack.push({ type: "em", attrs: {}, children: [] });
        break;
      case "s_open":
        stack.push({ type: "s", attrs: {}, children: [] });
        break;
      case "mark_open":
        stack.push({ type: "mark", attrs: {}, children: [] });
        break;
      case "link_open": {
        const attrs: Record<string, string> = {};
        if (token.attrs) {
          for (const [key, value] of token.attrs) {
            attrs[key] = value;
          }
        }
        stack.push({ type: "a", attrs, children: [] });
        break;
      }

      case "strong_close":
      case "em_close":
      case "s_close":
      case "mark_close":
      case "link_close": {
        const frame = stack.pop();
        if (!frame) {
          break;
        }
        pushChild(renderFrame(frame, nextKey()));
        break;
      }

      default:
        // Unknown / unsupported inline token — emit its content unwrapped so
        // text isn't lost. (We deliberately drop the html_inline path; the
        // tokenizer is invoked with `allowHtml = false`, so it shouldn't
        // appear, but guarding the wildcard keeps surprising inputs visible.)
        if (token.content) {
          pushChild(<Fragment key={nextKey()}>{token.content}</Fragment>);
        }
        break;
    }
  }

  // If the stream ended mid-mark (e.g. malformed input), flush remaining
  // frames inside-out so we don't drop their content.
  while (stack.length) {
    const frame = stack.pop();
    if (!frame) {
      break;
    }
    pushChild(renderFrame(frame, nextKey()));
  }

  return root;
}

function renderFrame(frame: InlineFrame, key: string): ReactNode {
  const children = frame.children;
  switch (frame.type) {
    case "strong":
      return <strong key={key}>{children}</strong>;
    case "em":
      return <em key={key}>{children}</em>;
    case "s":
      return <s key={key}>{children}</s>;
    case "mark":
      return <mark key={key}>{children}</mark>;
    case "a": {
      const href = frame.attrs.href || undefined;
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }
  }
}
