/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Max block size the prompt line grows to before it caps and shows a vertical
 * scrollbar. Shared by both editing surfaces — the lite `<textarea>`
 * ([./prompt-line-controller.ts]) and the rich Tiptap content node
 * ([./tiptap/editor-styles.ts]) — so the two modes cap at the same height and
 * the textarea→rich swap stays imperceptible. Keep them reading this one
 * constant so they can't drift.
 */
export const PROMPT_LINE_MAX_BLOCK_SIZE = "157px";
