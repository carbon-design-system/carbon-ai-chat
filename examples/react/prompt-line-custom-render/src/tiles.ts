/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Tile fixtures for the prompt-line-custom-render example.
 *
 * Demonstrates: the shape of the host-page data that backs both the clickable
 * tile grid and the custom `tileChip` Tiptap node injected into the chat
 * input. `value` is what the editor serializes as text (so the send button
 * enables); `id` / `label` / `value` ride along in structured data.
 *
 * APIs exercised:
 *   - (plain data) — no `@carbon/ai-chat` API
 *
 * Start reading at: the `tiles` export.
 */

interface Tile {
  /** Stable identifier — sent in the structured-data metadata. */
  id: string;
  /** Human-readable name shown on the tile (page grid, input, and bubble). */
  label: string;
  /** Supporting copy shown on the tile. */
  description: string;
  /** Machine value the node serializes to text and sends in structured data. */
  value: string;
}

const tiles: Tile[] = [
  {
    id: "summarize-thread",
    label: "Summarize thread",
    description: "Condense the current conversation into a short recap.",
    value: "summarize-thread",
  },
  {
    id: "draft-reply",
    label: "Draft a reply",
    description: "Generate a suggested response to the latest message.",
    value: "draft-reply",
  },
  {
    id: "translate-es",
    label: "Translate to Spanish",
    description: "Translate the selected content into Spanish.",
    value: "translate-es",
  },
  {
    id: "extract-actions",
    label: "Extract action items",
    description: "Pull out every task and owner mentioned so far.",
    value: "extract-actions",
  },
];

export { tiles, Tile };
