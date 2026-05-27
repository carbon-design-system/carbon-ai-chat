/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, TemplateResult } from "lit";
import MarkdownIt, { Token } from "markdown-it";

import {
  getPluginOverriddenRules,
  PLUGIN_DELEGABLE_TOKEN_TYPES,
  type TokenTree,
} from "../markdown-token-tree.js";
import { sanitizeHtmlContent } from "./lit-directives.js";
import type { RenderTokenTreeOptions } from "../markdown-renderer-types.js";

/**
 * Slot-name prefix shared by every plugin-fallback descriptor. The element
 * suffixes a render-scoped sequence number; the markdown component uses this
 * prefix when adopting the light-DOM host so external observers can target
 * plugin output with CSS or query selectors.
 *
 * @internal
 */
export const PLUGIN_FALLBACK_SLOT_PREFIX =
  "cds-aichat-markdown-renderer-pluginFallback";

// Token types our hand-written renderer handles natively (no markdown-it
// fallback needed).
const NATIVELY_HANDLED_TOKEN_TYPES = new Set<string>([
  "root",
  "text",
  "code_inline",
  "fence",
  "html_block",
  "html_inline",
  "html_container",
  "inline",
]);

// HTML tags whose paired open/close (or self-contained leaf) is rendered by
// `renderWithStaticTag`. Anything else falls through to the markdown-it
// renderer fallback.
const NATIVELY_HANDLED_TAGS = new Set<string>([
  "p",
  "blockquote",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "cds-checkbox",
  "strong",
  "em",
  "code",
  "del",
  "sub",
  "sup",
  "span",
  "i",
  "b",
  "small",
  "mark",
  "ins",
  "s",
  "kbd",
  "var",
  "samp",
  "cite",
  "abbr",
  "dfn",
  "time",
  "q",
  "a",
  "table",
  "img",
  // Table internals — their open/close pairs are walked into via children.
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  // Task-list checkbox input element produced by markdown-it-task-lists.
  "input",
]);

/**
 * True when the renderer can dispatch `token` itself (hand-written Lit
 * template). False when an unknown plugin-introduced token type or tag should
 * route through `md.renderer.render()`.
 */
export function isNativelyHandled(token: Partial<Token>): boolean {
  if (token.type && NATIVELY_HANDLED_TOKEN_TYPES.has(token.type)) {
    return true;
  }
  if (token.tag && NATIVELY_HANDLED_TAGS.has(token.tag)) {
    return true;
  }
  return false;
}

/**
 * True when the token's type is in the curated delegation allow-list and a
 * user-supplied markdown-it plugin has overridden (or added) the matching
 * `md.renderer.rules[type]`. Native dispatch sites consult this to decide
 * whether to route through `md.renderer.render()` instead of the hand-written
 * Lit template.
 */
export function shouldDelegateToPluginRule(
  token: Partial<Token>,
  md: MarkdownIt | undefined,
): boolean {
  if (!token.type || !md) {
    return false;
  }
  if (!PLUGIN_DELEGABLE_TOKEN_TYPES.has(token.type)) {
    return false;
  }
  return getPluginOverriddenRules(md).has(token.type);
}

function synthesizeCloseToken(openToken: Token): Token {
  const closeType = openToken.type.replace(/_open$/, "_close");
  return {
    type: closeType,
    tag: openToken.tag,
    nesting: -1,
    level: Math.max(0, openToken.level - 1),
    content: "",
    attrs: null,
    children: null,
    markup: openToken.markup,
    block: openToken.block,
    hidden: false,
    map: null,
    info: "",
    meta: null,
  } as Token;
}

/**
 * Re-emits the original flat markdown-it token sequence beneath `node` so the
 * sequence can be passed to `md.renderer.render()`. `inline` tokens are emitted
 * as-is (markdown-it's renderer reads their `.children` directly).
 */
function flattenSubtree(node: TokenTree): Token[] {
  const tokens: Token[] = [];
  for (const child of node.children) {
    const t = child.token as Token;
    if (t.type === "inline") {
      tokens.push(t);
    } else if (t.nesting === 1) {
      tokens.push(t);
      tokens.push(...flattenSubtree(child));
      tokens.push(synthesizeCloseToken(t));
    } else {
      tokens.push(t);
    }
  }
  return tokens;
}

/**
 * Builds the flat token slice to hand to `md.renderer.render()` for a token the
 * native renderer doesn't handle. Leaf tokens render alone; paired-container
 * opens reassemble `[open, ...children, close]` from the tree.
 */
function sliceForFallback(token: Token, node: TokenTree): Token[] {
  if (token.nesting === 1) {
    return [token, ...flattenSubtree(node), synthesizeCloseToken(token)];
  }
  return [token];
}

/**
 * Renders an unknown token via markdown-it's HTML renderer and emits a named
 * `<slot>` placeholder. The markdown element adopts a light-DOM
 * `<div slot="…">` host containing the sanitized HTML so consumer-supplied
 * CSS (e.g. KaTeX's stylesheet) reaches the rendered output.
 *
 * For leaf token types in {@link PLUGIN_DELEGABLE_TOKEN_TYPES} the rendered
 * HTML is cached on the {@link TokenTree} node and inherited across
 * `diffTokenTree` calls when the underlying token is unchanged — so a stable
 * earlier-in-document fence/image/etc. doesn't re-invoke the plugin's rule on
 * every streaming chunk. The cache is tagged with the `MarkdownIt` instance
 * that produced it; a plugin swap (which builds a fresh instance) invalidates
 * the cache automatically.
 */
export function renderFallback(
  token: Token,
  node: TokenTree,
  md: MarkdownIt,
  sanitize: boolean,
  options: RenderTokenTreeOptions,
): TemplateResult {
  let safe: string;
  if (node?.cachedHtml && node.cachedHtml.md === md) {
    safe = node.cachedHtml.html;
  } else {
    const slice = sliceForFallback(token, node);
    const htmlStr = md.renderer.render(slice, md.options, {});
    safe = sanitize ? sanitizeHtmlContent(htmlStr) : htmlStr;
    if (
      node &&
      typeof token.type === "string" &&
      PLUGIN_DELEGABLE_TOKEN_TYPES.has(token.type)
    ) {
      node.cachedHtml = { md, html: safe };
    }
  }

  const index = options.pluginSlotCounter?.next() ?? 0;
  const slotName = `${PLUGIN_FALLBACK_SLOT_PREFIX}-${index}`;
  options.recordCustomRender?.({
    slotName,
    kind: "pluginFallback",
    token,
    node,
    html: safe,
    isInline: token.block === false,
  });
  return html`<slot name=${slotName}></slot>`;
}
