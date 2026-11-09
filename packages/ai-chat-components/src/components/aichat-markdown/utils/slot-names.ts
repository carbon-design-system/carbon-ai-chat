/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { RenderTokenTreeOptions } from '../markdown-renderer-types.js';

/**
 * Slot-name prefix shared by every custom-renderer descriptor. External
 * observers target rendered blocks with `[slot^="…-renderer-table-"]` and
 * friends, so the prefix and the `-<kind>-` segment after it are stable;
 * everything past that is opaque.
 *
 * @internal
 */
export const MARKDOWN_SLOT_PREFIX = 'cds-aichat-markdown-renderer';

/**
 * Key the per-page instance sequence is parked under. It lives on `globalThis`
 * rather than in a module-scoped `let` so every copy of this module loaded on
 * the page advances one sequence — the `es` and `es-custom` builds are separate
 * module scopes with separate class definitions. Without `globalThis`, each
 * build would start counting from zero.
 *
 * The name is deliberately underscore-prefixed and camelCase: the `es-custom`
 * build rewrites the bare tokens `cds` and `cds-aichat` in every emitted file
 * (`tasks/build.js`), and neither word-boundary regex can match inside
 * `__cdsAIChat…`, so both builds agree on the key.
 *
 * @internal
 */
const INSTANCE_SEQUENCE_KEY = '__cdsAIChatMarkdownInstanceSequence';

/**
 * Mints the namespace that scopes every slot name one `cds-aichat-markdown`
 * element emits. Call once per element, at construction.
 *
 * A page-global sequence rather than a random id: uniqueness comes from the
 * shared counter, and short deterministic names stay readable in DevTools and
 * in test output.
 *
 * The count is base-36, not decimal, so the sequence reads `e1`, `e2`, … `e9`,
 * `ea`, … `ez`, `e10`. The `e` keeps the suffix from being read as one more of
 * the numeric position segments the base name already ends in
 * (`…-codeBlock-0-0-e3`, not `…-codeBlock-0-0-3`).
 *
 * @internal
 */
export function nextMarkdownInstanceId(): string {
  const scope = globalThis as unknown as Record<string, number | undefined>;
  const next = (scope[INSTANCE_SEQUENCE_KEY] ?? 0) + 1;
  scope[INSTANCE_SEQUENCE_KEY] = next;
  return `e${next.toString(36)}`;
}

/**
 * Appends the owning element's namespace to a parent-scoped slot name.
 *
 * Slot hosts are hoisted out of the markdown element into a single page-level
 * container (see the chat containers in `@carbon/ai-chat`) and projected back
 * by name, so a name that is unique only within one element collides across
 * elements: the first element's `<slot>` gathers every matching host and the
 * rest gather none.
 *
 * The namespace is a *suffix* so `[slot^="cds-aichat-markdown-renderer-…"]`
 * selectors keep matching. Falls back to the bare name when the renderer is
 * driven directly, without an owning element.
 *
 * @internal
 */
export function withInstanceNamespace(
  baseName: string,
  options: RenderTokenTreeOptions
): string {
  return options.slotNamespace
    ? `${baseName}-${options.slotNamespace}`
    : baseName;
}
