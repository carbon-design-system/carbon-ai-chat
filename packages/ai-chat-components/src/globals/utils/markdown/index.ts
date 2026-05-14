/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Public entry point for the markdown parsing + rendering utilities used by
 * `<cds-aichat-markdown>` and by the chat-side rich user message bubble.
 */

export {
  markdownToTokenTree,
  markdownToMarkdownItTokens,
  buildTokenTree,
  diffTokenTree,
} from "./markdown-token-tree.js";
export type { TokenTree } from "./markdown-token-tree.js";

export { renderTokenTree } from "./markdown-renderer.js";
export type { RenderTokenTreeOptions } from "./markdown-renderer.js";
