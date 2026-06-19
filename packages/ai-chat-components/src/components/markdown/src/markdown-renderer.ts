/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Walks a `TokenTree` and emits a Lit `TemplateResult` plus a batch of {@link MarkdownRendererSlotDescriptor} records the markdown element consumes during its `updated()` reconcile. External callers should go through {@link renderMarkdownTree} so the batch isn't accidentally dropped.
 *
 * ### Dispatch precedence
 *
 * Per token, in order:
 *
 * 1. **Consumer override** — `options.customRenderers?.[kind]` for `kind` in `{ table, codeBlock }`. The renderer emits a named `<slot>` placeholder and records a descriptor; the markdown element's `updated()` invokes the consumer callback later.
 * 2. **Plugin-overridden rule** — `shouldDelegateToPluginRule(token, md)` is true when a user-supplied markdown-it plugin overrode the renderer rule for one of the curated leaf tokens in `PLUGIN_DELEGABLE_TOKEN_TYPES` (`fence`, `image`, `code_inline`, `html_block`). The token routes through `renderFallback` and surfaces as a `pluginFallback` descriptor.
 * 3. **Native Lit dispatch** — the hand-written `renderWithStaticTag` switch. Kept flat (rather than a tag-to-renderer map) so the per-tag exceptions — task-list passthrough, Carbon `cds-unordered-list` / `cds-ordered-list` wrappers, automatic `target="_blank"` on `<a>`, image plugin delegation — stay easy to grep.
 * 4. **Unknown plugin-introduced token** — anything not natively handled falls through to `renderFallback`, so plugins that register `md.renderer.rules[type]` (footnote, deflist, custom containers, emoji) just work.
 *
 * ### Slot contract
 *
 * {@link MarkdownRendererSlotDescriptor} (defined in `./markdown-renderer-types.ts`) is the bridge between this module and `./markdown.ts`. This module appends descriptors via `recordCustomRender`; the markdown element's `reconcileCustomRendererHosts` consumes them, invokes consumer callbacks (or adopts plugin-fallback HTML) and attaches the result as a light-DOM `<div slot="…">` host (or `<span>` for inline plugin output).
 */

import DOMPurify from "dompurify";
import { html, TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { Token } from "markdown-it";
import "@carbon/web-components/es/components/list/index.js";
import "@carbon/web-components/es/components/checkbox/index.js";
import "../../code-snippet/index.js";
import "../../card/index.js";
import "../../table/index.js";
import { defaultLineCountText } from "../../code-snippet/src/formatters.js";

import { renderTable } from "./utils/table-helpers.js";
import {
  combineConsecutiveHtmlInline,
  combineSplitHtmlBlocks,
} from "./utils/html-helpers.js";
import {
  htmlContainer,
  sanitizeHtmlContent,
  spread,
} from "./utils/lit-directives.js";
import {
  isNativelyHandled,
  renderFallback,
  shouldDelegateToPluginRule,
} from "./utils/plugin-fallback.js";
import { type TokenTree } from "./markdown-token-tree.js";
import type {
  MarkdownRendererSlotDescriptor,
  RenderTokenTreeOptions,
} from "./markdown-renderer-types.js";

// Re-export types so existing imports of these from this module keep working.
export type {
  MarkdownCustomRenderers,
  MarkdownRendererCodeBlockArgs,
  MarkdownRendererCodeBlockData,
  MarkdownRendererSlotDescriptor,
  MarkdownRendererTableArgs,
  MarkdownRendererTableData,
  RenderTokenTreeOptions,
} from "./markdown-renderer-types.js";

/**
 * Stable, parent-scoped slot name for an overridable token. Uses `startLine`
 * (not the full `token.map`) so the name doesn't change when the token's
 * `endLine` advances during streaming. The `currentIndex` from the parent
 * context disambiguates siblings on the same start line (rare but possible).
 */
function slotNameFor(
  kind: "table" | "codeBlock",
  token: Token,
  options: RenderTokenTreeOptions,
): string {
  const startLine = token.map?.[0] ?? 0;
  const index = options.context?.currentIndex ?? 0;
  return `cds-aichat-markdown-renderer-${kind}-${startLine}-${index}`;
}

function renderChildTokenTrees(
  children: TokenTree[],
  options: RenderTokenTreeOptions,
  childContext?: RenderTokenTreeOptions["context"],
): TemplateResult {
  const normalizedChildren = combineConsecutiveHtmlInline(
    combineSplitHtmlBlocks(children),
  );

  // Multiple or complex children: use repeat for stable keying
  return html`${repeat(
    normalizedChildren,
    (child, index) => {
      // Key by start line + type + tag rather than array index so blocks keep
      // a stable identity when earlier siblings transiently merge/split during
      // streaming re-parses (which would otherwise re-key and remount later
      // blocks — e.g. remounting a code snippet and reloading its editor). We
      // use `token.map?.[0]` (start line, like `slotNameFor`) rather than the
      // node's `key`/`generateKey`, whose embedded end line advances every tick.
      const startLine = child.token.map?.[0] ?? index;
      const stableKey = `${startLine}:${child.token.type}:${child.token.tag}`;

      if (child.token.type?.includes("table")) {
        return `table-${stableKey}`;
      }

      return `stable-${stableKey}`;
    },
    (child, index) => {
      const result = renderTokenTree(child, {
        ...options,
        context: {
          ...childContext,
          parentChildren: normalizedChildren,
          currentIndex: index,
        },
      });
      // Ensure we never return undefined, which Lit would render as the string "undefined"
      return result ?? html``;
    },
  )}`;
}

/**
 * Top-level entry: renders a markdown token tree to a Lit `TemplateResult`
 * and returns the batch of custom-renderer slot descriptors collected along
 * the way. Callers receive both pieces in one call so the batch can't be
 * accidentally dropped.
 */
export function renderMarkdownTree(
  node: TokenTree,
  options: RenderTokenTreeOptions,
): {
  template: TemplateResult;
  batch: MarkdownRendererSlotDescriptor[];
} {
  const batch: MarkdownRendererSlotDescriptor[] = [];
  let pluginSlotIndex = 0;
  const template = renderTokenTree(node, {
    ...options,
    recordCustomRender: (descriptor) => batch.push(descriptor),
    pluginSlotCounter: { next: () => pluginSlotIndex++ },
  });
  return { template, batch };
}

/**
 * Converts TokenTree to Lit TemplateResult.
 *
 * Recursive renderer; external callers should use {@link renderMarkdownTree}
 * which collects the slot-descriptor batch.
 */
export function renderTokenTree(
  node: TokenTree,
  options: RenderTokenTreeOptions,
): TemplateResult {
  const { token, children } = node;
  const { context, sanitize } = options;

  // Handle raw HTML blocks and inline HTML
  if (token.type === "html_block" || token.type === "html_inline") {
    // Plugin-overridden html_block rules (rare but supported) — route through
    // the plugin's renderer before our default unsafeHTML pass-through.
    if (
      token.type === "html_block" &&
      shouldDelegateToPluginRule(token, options.md) &&
      options.md
    ) {
      return renderFallback(
        token as Token,
        node,
        options.md,
        sanitize,
        options,
      );
    }

    let content = token.content || "";

    // Apply HTML sanitization if requested
    if (sanitize && content) {
      content = sanitizeHtmlContent(content);
    }

    return html`${unsafeHTML(content)}`;
  }

  // Handle split HTML blocks that wrap markdown siblings (e.g. <details>…</details>).
  if (token.type === "html_container") {
    const openingHtml = token.content ?? "";
    const innerContent = renderChildTokenTrees(children, options, context);

    return html`<div
      class="cds-aichat-markdown-html-container"
      ${htmlContainer(openingHtml, innerContent, sanitize)}
    ></div>`;
  }

  // Handle plain text content
  if (token.type === "text") {
    return html`${token.content}`;
  }

  // Handle inline code spans
  if (token.type === "code_inline") {
    if (shouldDelegateToPluginRule(token, options.md) && options.md) {
      return renderFallback(
        token as Token,
        node,
        options.md,
        sanitize,
        options,
      );
    }
    return html`<code>${token.content}</code>`;
  }

  // Handle fenced code blocks
  if (token.type === "fence") {
    const language = token.info?.trim() ?? "";
    const {
      codeSnippetHighlight = true,
      codeSnippetShowLessText,
      codeSnippetShowMoreText,
      codeSnippetCopyButtonTooltipContent,
      codeSnippetGetLineCountText = defaultLineCountText,
      codeSnippetAriaLabelReadOnly,
      codeSnippetAriaLabelEditable,
    } = options;

    const defaultTemplate = html`<cds-aichat-card is-flush>
      <div slot="body">
        <cds-aichat-code-snippet
          data-rounded
          .language=${language}
          .highlight=${codeSnippetHighlight}
          .detectLanguage=${true}
          .showLessText=${codeSnippetShowLessText}
          .showMoreText=${codeSnippetShowMoreText}
          .copyButtonTooltipContent=${codeSnippetCopyButtonTooltipContent}
          .getLineCountText=${codeSnippetGetLineCountText}
          .ariaLabelReadOnly=${codeSnippetAriaLabelReadOnly}
          .ariaLabelEditable=${codeSnippetAriaLabelEditable}
          .code=${token.content}
        ></cds-aichat-code-snippet>
      </div>
    </cds-aichat-card>`;

    if (options.customRenderers?.codeBlock) {
      const slotName = slotNameFor("codeBlock", token as Token, options);
      options.recordCustomRender?.({
        slotName,
        kind: "codeBlock",
        token: token as Token,
        node,
        data: {
          language,
          code: token.content ?? "",
          isStreaming: !!options.streaming,
        },
      });
      return html`<slot name=${slotName}>${defaultTemplate}</slot>`;
    }

    // Honor user-plugin `fence` overrides (markdown-it-mermaid, syntax
    // highlighters, etc.). customRenderer slot above wins when set.
    if (shouldDelegateToPluginRule(token, options.md) && options.md) {
      return renderFallback(
        token as Token,
        node,
        options.md,
        sanitize,
        options,
      );
    }

    return defaultTemplate;
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
    content = renderChildTokenTrees(children, options, childContext);
  }

  // Unknown plugin-introduced tokens (no tag we recognize) — defer to
  // markdown-it's renderer so plugins that register md.renderer.rules[type]
  // (footnote, emoji, deflist, container, etc.) just work.
  if (!tag && options.md && !isNativelyHandled(token)) {
    return renderFallback(token as Token, node, options.md, sanitize, options);
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

    case "hr":
      return html`<hr ${spread(attrs)} />`;

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
      return html`<p>
        <cds-unordered-list ?nested=${nested} ${spread(attrs)}>
          ${content}
        </cds-unordered-list>
      </p>`;
    }

    case "ol": {
      const nested = token.level > 1;
      if (hasTaskListItems(node)) {
        return html`<ol ${spread(attrs)}>
          ${content}
        </ol>`;
      }
      return html`<p>
        <cds-ordered-list native ?nested=${nested} ${spread(attrs)}>
          ${content}
        </cds-ordered-list>
      </p>`;
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
        disabled === undefined ? false : disabled === "" || disabled === "true";

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

    // Self-closing image. Plugin-introduced wrappers (e.g. image-figures)
    // route through `shouldDelegateToPluginRule` before falling back to a
    // plain `<img>` element.
    case "img":
      if (node && options.md && shouldDelegateToPluginRule(token, options.md)) {
        return renderFallback(
          token,
          node,
          options.md,
          options.sanitize,
          options,
        );
      }
      return html`<img ${spread(attrs)} />`;

    // Tables with Carbon component and streaming support
    case "table": {
      if (!node) {
        return html`<div>Error: Missing table data</div>`;
      }
      const slotName = options.customRenderers?.table
        ? slotNameFor("table", token, options)
        : undefined;
      return renderTable(
        token,
        node,
        attrs,
        options,
        renderTokenTree,
        slotName,
      );
    }

    // Fallback for unknown tags. If we have the markdown-it instance available,
    // defer to its renderer for plugin-introduced container tags (footnote_block,
    // dl/dt/dd from deflist, custom containers, etc.). Otherwise fall back to
    // a generic <div>.
    default:
      if (options.md && node && !isNativelyHandled(token)) {
        return renderFallback(
          token,
          node,
          options.md,
          options.sanitize,
          options,
        );
      }
      return html`<div ${spread(attrs)}>${content}</div>`;
  }
}
