/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import prefix from '../../../globals/settings.js';
import { renderTokenTree } from './markdown-renderer.js';
import {
  markdownToTokenTree,
  type MarkdownItPlugin,
} from './markdown-token-tree.js';
import type { MarkdownCustomRenderers } from './markdown-renderer-types.js';
import { nextMarkdownInstanceId } from './utils/slot-names.js';
import {
  validateInlineAttributes,
  validateInlineHTML,
  validateInlineTree,
} from './utils/inline-validation.js';
import { inlinePluginSlot } from './utils/inline-plugin-slot.js';

export { InlineMarkdownError } from './utils/inline-validation.js';
/**
 * Styles for {@link renderInlineMarkdown} output. Install them in each root
 * that renders the result.
 * @category Messaging
 */
export { default as inlineMarkdownStyles } from './inline-markdown.scss?lit';

/**
 * Controls inline parsing, HTML filtering, and host transforms.
 * @category Messaging
 */
export interface InlineMarkdownOptions {
  /** Filter unsafe HTML and attributes. Defaults to false. */
  sanitizeHTML?: boolean;
  /** Keep source HTML as escaped text. Defaults to false. */
  removeHTML?: boolean;
  /** Extend the shared parser. Use a new array when plugins change. */
  markdownItPlugins?: MarkdownItPlugin[];
  /** Transform native links and images with the block renderer's callbacks. */
  customRenderers?: Pick<MarkdownCustomRenderers, 'link' | 'image'>;
  /**
   * Project plugin HTML through the plugin-host slot protocol. Defaults to
   * false. An unclaimed slot shows the token source as fallback text. A slot
   * rendered while detached checks each frame until it connects, so dispose a
   * root with `setConnected(false)`.
   */
  projectPluginOutput?: boolean;
}

/**
 * Returns a template for one inline paragraph, preserving edge spaces. Render
 * it into your own root and install {@link inlineMarkdownStyles} there.
 * Parsing, callbacks, and validation finish before this function returns.
 *
 * @throws {@link InlineMarkdownError} when the source contains blocks or the output is not inline.
 * @category Messaging
 */
export function renderInlineMarkdown(
  source: string,
  options: InlineMarkdownOptions = {}
): TemplateResult {
  const { tree, md } = markdownToTokenTree(source, undefined, {
    removeHtml: options.removeHTML ?? false,
    markdownItPlugins: options.markdownItPlugins,
  });
  const paragraph = validateInlineTree(tree);
  const edgeSource = source.replace(/^[\r\n]+|[\r\n]+$/g, '');
  if (!paragraph) {
    const spaces = /^\s*$/.test(source) ? source.replace(/[\r\n]/g, '') : '';
    return spaces
      ? html`<span class=${`${prefix}-inline-markdown`}>${spaces}</span>`
      : html``;
  }
  const namespace = nextMarkdownInstanceId();
  let slotIndex = 0;
  const content = renderTokenTree(
    { ...paragraph, token: { ...paragraph.token, tag: '', type: 'inline' } },
    {
      sanitize: options.sanitizeHTML ?? false,
      md,
      customRenderers: options.customRenderers,
      inline: {
        validateAttributes: validateInlineAttributes,
        renderHTML: (markup, token) => {
          validateInlineHTML(markup);
          if (!options.projectPluginOutput || !token) {
            return html`${unsafeHTML(markup)}`;
          }
          const slotName = `${prefix}-inline-markdown-plugin-${namespace}-${slotIndex++}`;
          const fallback = token.content || markup.replace(/<[^>]*>/g, '');
          return html`<slot
            name=${slotName}
            ${inlinePluginSlot({
              kind: 'pluginFallback',
              slotName,
              html: markup,
              isInline: true,
            })}
            >${fallback}</slot
          >`;
        },
      },
    }
  );
  const leading = edgeSource.match(/^[\t ]*/)?.[0] ?? '';
  const trailing = edgeSource.match(/[\t ]*$/)?.[0] ?? '';
  return html`<span class=${`${prefix}-inline-markdown`}
    >${leading}${content}${trailing}</span
  >`;
}
