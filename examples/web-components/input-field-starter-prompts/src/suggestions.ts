/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { SuggestionItem } from "@carbon/ai-chat";

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
