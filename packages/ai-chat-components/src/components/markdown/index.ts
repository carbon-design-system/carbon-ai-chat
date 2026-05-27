/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./src/markdown.js";
export { default, CDSAIChatMarkdown } from "./src/markdown.js";
export type {
  MarkdownCustomRenderers,
  MarkdownRendererCodeBlockArgs,
  MarkdownRendererCodeBlockData,
  MarkdownRendererTableArgs,
  MarkdownRendererTableData,
} from "./src/markdown-renderer-types.js";
export type { MarkdownItPlugin, TokenTree } from "./src/markdown-token-tree.js";
