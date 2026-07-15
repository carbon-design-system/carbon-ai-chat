/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Static suggestion datasets for the mentions-and-commands example.
 *
 * Demonstrates: shape of `SuggestionItem[]` consumed by
 * `PublicConfig.input.suggestions[].items` — both the async
 * filtered source (`mentionItems`) and the static array source
 * (`commandItems`).
 *
 * APIs exercised: `SuggestionItem` (`id` / `label` / `description`).
 *
 * Start reading at: `mentionItems`.
 */

import { SuggestionItem } from "@carbon/ai-chat";

// Replace with a real production implementation.
const mentionItems: SuggestionItem[] = [
  {
    id: "u1",
    label: "Jane Smith",
    description: "Design Lead",
  },
  {
    id: "u2",
    label: "Bob Chen",
    description: "Frontend Engineer",
  },
  {
    id: "u3",
    label: "Alice Park",
    description: "Product Manager",
  },
  {
    id: "u4",
    label: "Carlos Rivera",
    description: "Backend Engineer",
  },
  {
    id: "u5",
    label: "Dana Williams",
    description: "QA Engineer",
  },
];

// Replace with a real production implementation.
const commandItems: SuggestionItem[] = [
  {
    id: "summarize",
    label: "summarize",
    description: "Summarize the conversation",
  },
  {
    id: "translate",
    label: "translate",
    description: "Translate to another language",
  },
  {
    id: "clear",
    label: "clear",
    description: "Clear the conversation",
  },
  {
    id: "help",
    label: "help",
    description: "Show available commands",
  },
];

export { mentionItems, commandItems };
