/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { SuggestionItem } from "@carbon/ai-chat";

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
