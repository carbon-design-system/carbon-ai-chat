/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '../../globals/register.js';
import '../aichat-card/index.js';
import '../aichat-code-snippet/index.js';
import '../aichat-table/index.js';
import CDSAIChatMarkdown from './aichat-markdown.js';

export { default, CDSAIChatMarkdown } from './aichat-markdown.js';
export type {
  MarkdownCustomRenderers,
  MarkdownRendererChecklist,
  MarkdownRendererChecklistItemArgs,
  MarkdownRendererChecklistToggleArgs,
  MarkdownRendererCodeBlockArgs,
  MarkdownRendererCodeBlockData,
  MarkdownRendererImageArgs,
  MarkdownRendererImageResult,
  MarkdownRendererLinkArgs,
  MarkdownRendererLinkResult,
  MarkdownRendererTableArgs,
  MarkdownRendererTableData,
} from './markdown-renderer-types.js';
export type {
  MarkdownCustomRendererMountDetail,
  MarkdownPluginFallbackMountDetail,
  MarkdownPluginHostMountDetail,
  MarkdownPluginHostMountDetailInput,
} from './utils/plugin-host-container.js';
export type { MarkdownItPlugin, TokenTree } from './markdown-token-tree.js';
export { markdownToMarkdownItTokens } from './markdown-token-tree.js';

export {
  renderInlineMarkdown,
  InlineMarkdownError,
  inlineMarkdownStyles,
} from './inline-markdown.js';
export type { InlineMarkdownOptions } from './inline-markdown.js';

defineCustomElement(CDSAIChatMarkdown);
