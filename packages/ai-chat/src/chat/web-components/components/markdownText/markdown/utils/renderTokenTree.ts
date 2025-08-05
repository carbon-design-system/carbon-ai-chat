/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { type Token } from "markdown-it";

import { type TokenTree } from "./tokenTree";

import "../../../codeElement/cds-aichat-code";

/**
 * Recursively renders a TokenTree into a Lit TemplateResult.
 *
 * This function handles the full translation from markdown-it token trees into
 * Lit-based HTML output. It supports both block-level and inline formatting,
 * sanitizes content if needed, and uses structural recursion to handle nesting.
 *
 * The function supports:
 * - Raw HTML embedding (with optional DOM sanitization)
 * - Text and code content
 * - Structural markdown elements (headings, lists, tables, etc.)
 * - Custom markdown-it attributes (e.g. class, id, rel)
 */
async function renderTokenTree(
  node: TokenTree,
  sanitize: boolean
): Promise<TemplateResult> {
  const { token, children } = node;

  // Handle raw HTML (e.g., <iframe>, <video>, or custom elements like <my-widget>)
  // These are trusted HTML blocks or inlines that bypass regular markdown rendering.
  if (token.type === "html_block" || token.type === "html_inline") {
    const raw = token.content;

    // If sanitization is enabled, use DOMPurify to strip unsafe HTML.
    let content = raw;
    if (sanitize) {
      const { default: DOMPurify } = await import("dompurify");
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
    return html`<code class="WACWidget__MarkdownCode">${token.content}</code>`;
  }

  // Fenced code blocks (e.g., ```js\nconsole.log('hello')\n```)
  if (token.type === "fence") {
    const language = token.info?.trim() ?? "";
    return html`<cds-aichat-code
      language=${language}
      content=${token.content}
    ></cds-aichat-code>`;
  }

  // Default case: token represents a structural element (e.g., <p>, <ul>, <h1>, etc.)

  // Resolve the HTML tag name from the token.
  const tag = token.tag || "div";

  // Convert markdown-it attributes (array of [key, value]) into an object.
  const rawAttrs = (token.attrs || []).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  // If sanitizing, filter out any unsafe attributes (e.g., onclick, javascript: URLs).
  let attrs = rawAttrs;
  if (sanitize) {
    const { default: DOMPurify } = await import("dompurify");
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

  // Recursively render all child nodes into Lit TemplateResults.
  // Use `repeat()` to give Lit a stable `key` per child, minimizing DOM updates.
  const childResults = await Promise.all(
    children.map((c) => renderTokenTree(c, sanitize))
  );
  const content: TemplateResult = html`${repeat(
    children,
    (c) => c.key,
    (_c, index) => childResults[index]
  )}`;

  // Use a static tag-based renderer to safely and predictably render known HTML tags.
  // Lit does not support dynamic tag names directly in the template syntax.
  return renderWithStaticTag(tag, token as Token, content, attrs);
}

/**
 * Renders a given HTML tag with its content and attributes.
 * All tag names must be static strings (per Lit rules).
 *
 * @param tag - The HTML tag or web component tag name.
 * @param token - The token object (for contextual rendering).
 * @param content - The content to go inside the element.
 * @param attrs - A sanitized record of attributes to spread.
 * @returns A TemplateResult to insert in the DOM.
 */
function renderWithStaticTag(
  tag: string,
  token: Token,
  content: TemplateResult,
  attrs: Record<string, string>
): TemplateResult {
  switch (tag) {
    case "p":
      return html`<p class="WACWidget__MarkdownP" ...=${attrs}>${content}</p>`;

    case "ul": {
      const className = `cds--list--unordered${
        token.level > 1 ? " cds--list--nested" : ""
      }`;
      return html`<ul class=${className} ...=${attrs}>
        ${content}
      </ul>`;
    }

    case "ol": {
      const className = `cds--list--ordered${
        token.level > 1 ? " cds--list--nested" : ""
      }`;
      return html`<ol class=${className} ...=${attrs}>
        ${content}
      </ol>`;
    }

    case "li":
      return html`<li class="cds--list__item" ...=${attrs}>${content}</li>`;

    case "h1":
      return html`<h1 class="WACWidget__MarkdownHeading" ...=${attrs}>
        ${content}
      </h1>`;

    case "h2":
      return html`<h2 class="WACWidget__MarkdownHeading" ...=${attrs}>
        ${content}
      </h2>`;

    case "h3":
      return html`<h3 class="WACWidget__MarkdownHeading" ...=${attrs}>
        ${content}
      </h3>`;

    case "h4":
      return html`<h4 class="WACWidget__MarkdownHeading" ...=${attrs}>
        ${content}
      </h4>`;

    case "h5":
      return html`<h5 class="WACWidget__MarkdownHeading" ...=${attrs}>
        ${content}
      </h5>`;

    case "h6":
      return html`<h6 class="WACWidget__MarkdownHeading" ...=${attrs}>
        ${content}
      </h6>`;

    case "blockquote":
      return html`<blockquote
        class="WACWidget__MarkdownBlockquote"
        ...=${attrs}
      >
        ${content}
      </blockquote>`;

    case "pre":
      return html`<pre class="WACWidget__MarkdownPre" ...=${attrs}>
${content}</pre
      >`;

    case "code":
      return html`<code class="WACWidget__MarkdownCode" ...=${attrs}
        >${content}</code
      >`;

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
      return html`<a class="cds--link cds--link-url" ...=${attrs}
        >${content}</a
      >`;

    case "table": {
      const className =
        "cds--data-table cds--data-table--zebra cds--data-table--md";
      return html`
        <div class="cds--layer-two cds--data-table-content">
          <table class=${className} ...=${attrs}>
            ${content}
          </table>
        </div>
      `;
    }

    case "thead":
      return html`<thead ...=${attrs}>
        ${content}
      </thead>`;
    case "tbody":
      return html`<tbody ...=${attrs}>
        ${content}
      </tbody>`;
    case "tr":
      return html`<tr ...=${attrs}>
        ${content}
      </tr>`;
    case "td":
      return html`<td ...=${attrs}>${content}</td>`;
    case "th":
      return html`<th ...=${attrs}>${content}</th>`;

    default:
      return html`<div ...=${attrs}>${content}</div>`;
  }
}

export { renderTokenTree };
