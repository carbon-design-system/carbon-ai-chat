/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { InputConfig } from "../../../types/config/InputConfig";

/**
 * Which prompt-line surface a given input config requires.
 * - `"rich"` — the Tiptap editor (`<cds-aichat-prompt-line rich>`).
 * - `"lite"` — the lightweight textarea.
 */
export type PromptLineMode = "rich" | "lite";

/**
 * Resolve the prompt-line mode from the input config: `"rich"` when any
 * advanced input feature is configured — a trigger-driven feature (mention /
 * command / autocomplete / starters) or host `tiptap.extensions` — otherwise
 * `"lite"`.
 *
 * Host `tiptap.extensions` force rich because an extension can contribute
 * typing-driven behavior — input rules, keyboard shortcuts, paste rules — that
 * only runs inside a live Tiptap editor; a lightweight textarea would silently
 * drop it (e.g. the code-snippet example's ``` input rule never fires without
 * the editor). An empty `extensions` array stays lite — there is nothing to
 * install. A chat configuring none of these ships no Tiptap and renders the
 * textarea until rich content is inserted via `instance.input.updateContent`
 * or the editor is requested via `instance.input.getEditor()`.
 *
 * Shared by `Input` (per-render, before the sticky latch) and the boot path
 * in `ChatAppEntry` (to preload the Tiptap chunk) so they always agree.
 */
export function resolvePromptLineMode(
  input: InputConfig | undefined,
): PromptLineMode {
  const hasAdvancedFeature =
    Boolean(input?.mention) ||
    Boolean(input?.command) ||
    Boolean(input?.autocomplete) ||
    (input?.starters?.length ?? 0) > 0 ||
    (input?.tiptap?.extensions?.length ?? 0) > 0;
  return hasAdvancedFeature ? "rich" : "lite";
}
