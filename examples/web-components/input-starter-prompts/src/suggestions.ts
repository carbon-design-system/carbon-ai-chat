/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Static catalog of starter prompts surfaced via `input.suggestions`.
 *
 * Demonstrates: the shape of a `SuggestionItem` consumed by a
 * `SuggestionType.STARTER` entry. Each item populates the input on click,
 * letting the user edit before sending.
 *
 * APIs exercised:
 *   - `SuggestionItem` (`id`, `label`, `description`, `value`)
 *
 * Start reading at: the `STARTER_PROMPTS` array below.
 */

import type { SuggestionItem } from "@carbon/ai-chat";

// Replace with a real production implementation; a real app would fetch this
// catalog from a backend or generate it from user context.
const STARTER_PROMPTS: SuggestionItem[] = [
  {
    id: "summarize-doc",
    label: "Summarize a document",
    description: "Paste a doc and get a quick recap",
    value: "Summarize this document for me: ",
  },
  {
    id: "draft-email",
    label: "Draft a professional email",
    description: "Polite and concise",
    value: "Draft a professional email about ",
  },
  {
    id: "explain-concept",
    label: "Explain a concept",
    description: "Plain-language explanations",
    value: "Explain the concept of ",
  },
  {
    id: "compare-options",
    label: "Compare two options",
    description: "Pros, cons, and recommendation",
    value: "Compare the pros and cons of ",
  },
  {
    id: "brainstorm-ideas",
    label: "Brainstorm ideas",
    description: "Generate fresh starting points",
    value: "Brainstorm ideas for ",
  },
];

export { STARTER_PROMPTS };
