/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import type { JSONContent } from '@tiptap/core';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import { adoptOnRoot } from '../../shared/dynamic-css-var-sheet.js';
import {
  inlineMarkdownStyles,
  renderInlineMarkdown,
  type InlineMarkdownOptions,
  type MarkdownCustomRenderers,
  type MarkdownItPlugin,
} from '../../markdown/index.js';
import { renderTokenChip } from '../../prompt-line/src/tiptap/render-token-chip.js';
import styles from './user-message-content.scss?lit';

const blockClass = `${prefix}-user-message-content`;

/** Node types that carry only text, so the whole document is plain markdown. */
const TEXTUAL_NODE_TYPES = new Set(['doc', 'paragraph', 'text', 'hardBreak']);

/** Node types drawn as chips by default. */
const CHIP_NODE_TYPES = new Set(['mention', 'command']);

/**
 * Renders a sent user message, which may include text, chips, and host-owned
 * custom nodes. It fills the default slot of `cds-aichat-message-item-shell`.
 *
 * A document with only text renders through `cds-aichat-markdown`. A document
 * with chips or custom nodes renders each paragraph inline, so text and chips
 * share one wrapping line. Text runs use `renderInlineMarkdown`.
 *
 * Each `mention`, `command`, or other custom node gets a named slot, in
 * document order. The slot stands for the whole node, so its children get no
 * slots. A block node has the slot name `${slot-prefix}::${index}`; an inline
 * node has `${slot-prefix}::${paragraphIndex}.${inlineIndex}`. A `mention` or
 * `command`node shows a chip until the slot is filled. Any other node shows
 * its `label` or `value` attribute.
 *
 * Text is always treated as untrusted: HTML in it shows as escaped source, and
 * the output of plugins and link and image renderers is sanitized, as in the
 * chat's sent messages.
 *
 * @experimental
 * @element cds-aichat-user-message-content
 *
 * @slot {slot-prefix}::{path} - Host content for the node at `path`. The element creates one slot per mention, command, or other custom node. Unfilled slots show the node's fallback.
 */
@carbonElement(blockClass)
class CDSAIChatUserMessageContent extends LitElement {
  static styles = [commonStyles, inlineMarkdownStyles, styles];

  /**
   * The sent user message to render, as a document of text and other nodes.
   */
  @property({ attribute: false })
  content?: JSONContent;

  /**
   * Prefix for slot names: `${slotPrefix}::${path}`. Use a value unique to this
   * message, such as its ID.
   */
  @property({ type: String, attribute: 'slot-prefix' })
  slotPrefix = '';

  /**
   * Markdown-it plugins for text. Use a stable array; a new reference reparses.
   */
  @property({ attribute: false })
  markdownItPlugins?: MarkdownItPlugin[];

  /**
   * Transforms for links and images in text.
   */
  @property({ attribute: false })
  customRenderers?: Pick<MarkdownCustomRenderers, 'link' | 'image'>;

  /**
   * Chip elements by node, so a re-render keeps the same element.
   */
  private _chips = new WeakMap<JSONContent, HTMLElement>();

  protected firstUpdated(): void {
    adoptOnRoot(this.renderRoot as ShadowRoot);
  }

  render() {
    const content = this.content;
    if (!content) {
      return nothing;
    }
    return html`<div class="${blockClass}__text">
      <div role="heading" aria-level="2">${this._renderBody(content)}</div>
    </div>`;
  }

  private _renderBody(content: JSONContent): TemplateResult {
    if (isPureTextualDoc(content)) {
      return html`<cds-aichat-markdown
        .markdown=${flattenTextualDoc(content)}
        .sanitizeHTML=${true}
        .removeHTML=${true}
        .markdownItPlugins=${this.markdownItPlugins}
        .customRenderers=${this.customRenderers}></cds-aichat-markdown>`;
    }
    return html`<div class="${blockClass}__content">
      ${(content.content ?? []).map((block, blockIndex) =>
        block.type === 'paragraph'
          ? this._renderParagraph(block, blockIndex)
          : html`<div class="${blockClass}__block">
              ${this._renderNodeSlot(block, `${blockIndex}`)}
            </div>`
      )}
    </div>`;
  }

  private _renderParagraph(
    paragraph: JSONContent,
    blockIndex: number
  ): TemplateResult {
    const parts: unknown[] = [];
    let run = '';
    const flush = (isLast: boolean) => {
      if (run) {
        parts.push(this._renderRun(run, parts.length === 0, isLast));
        run = '';
      }
    };

    (paragraph.content ?? []).forEach((node, inlineIndex) => {
      if (node.type === 'text' && typeof node.text === 'string') {
        run += node.text;
      } else if (node.type === 'hardBreak') {
        run += '\n';
      } else {
        flush(false);
        parts.push(this._renderNodeSlot(node, `${blockIndex}.${inlineIndex}`));
      }
    });
    flush(true);

    return html`<p>${parts}</p>`;
  }

  /**
   * Renders one run of text. The inline renderer drops newlines at the edge of
   * a run, so a break beside a chip is restored here. A run the renderer
   * rejects, such as one that reads as a heading, shows as plain text so none
   * of it is lost.
   */
  private _renderRun(
    run: string,
    isFirst: boolean,
    isLast: boolean
  ): TemplateResult {
    const leading = isFirst ? '' : (run.match(/^\n+/)?.[0] ?? '');
    const trailing = isLast ? '' : (run.match(/\n+$/)?.[0] ?? '');
    const body = run.slice(leading.length, run.length - trailing.length);

    let rendered: TemplateResult | typeof nothing = nothing;
    if (body) {
      try {
        rendered = renderInlineMarkdown(body, this._inlineOptions());
      } catch {
        rendered = html`<span class="${blockClass}__plain">${body}</span>`;
      }
    }
    return html`${breaks(leading)}${rendered}${breaks(trailing)}`;
  }

  private _inlineOptions(): InlineMarkdownOptions {
    return {
      sanitizeHTML: true,
      removeHTML: true,
      markdownItPlugins: this.markdownItPlugins,
      customRenderers: this.customRenderers,
    };
  }

  /**
   * A slot for a node that is not text. The node's fallback shows until the
   * host fills the slot.
   */
  private _renderNodeSlot(node: JSONContent, path: string): TemplateResult {
    const fallback = CHIP_NODE_TYPES.has(node.type ?? '')
      ? this._chip(node)
      : nodeLabel(node);
    return html`<slot
      name="${this.slotPrefix}::${path}"
      data-node-type=${node.type ?? ''}
      >${fallback}</slot
    >`;
  }

  private _chip(node: JSONContent): HTMLElement {
    let chip = this._chips.get(node);
    if (!chip) {
      chip = renderTokenChip({
        attrs: node.attrs ?? {},
        type: node.type ?? 'mention',
        context: 'historical',
      });
      this._chips.set(node, chip);
    }
    return chip;
  }
}

function isPureTextualDoc(content: JSONContent): boolean {
  const stack: JSONContent[] = [content];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.type && !TEXTUAL_NODE_TYPES.has(node.type)) {
      return false;
    }
    stack.push(...(node.content ?? []));
  }
  return true;
}

function flattenTextualDoc(content: JSONContent): string {
  const lines: string[] = [];
  for (const block of content.content ?? []) {
    if (block.type === 'paragraph') {
      lines.push(joinTextualInline(block.content ?? []));
    } else if (block.type === 'text' && block.text) {
      lines.push(block.text);
    }
  }
  return lines.join('\n');
}

function joinTextualInline(nodes: JSONContent[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      out += '\n';
    } else if (node.type === 'text' && typeof node.text === 'string') {
      out += node.text;
    }
  }
  return out;
}

function nodeLabel(node: JSONContent): string {
  const attrs = node.attrs ?? {};
  return String(attrs.label ?? attrs.value ?? '');
}

function breaks(newlines: string) {
  return Array.from(newlines, () => html`<br />`);
}

export { CDSAIChatUserMessageContent };
export default CDSAIChatUserMessageContent;

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-user-message-content': CDSAIChatUserMessageContent;
  }
}
