/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Starter prompt fixtures for the input-field-starter-prompts example.
 *
 * Demonstrates: the shape of a `SuggestionItem` array consumed by an
 * `input.suggestions` entry of type `SuggestionType.STARTER`. Each entry
 * carries a stable `id`, a short `label`, a longer `description`, and the
 * `value` that prefills the input when the suggestion is selected.
 *
 * APIs exercised:
 *   - `SuggestionItem`
 *
 * Start reading at: `STARTER_PROMPTS`.
 */

import { SuggestionItem } from "@carbon/ai-chat";

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
