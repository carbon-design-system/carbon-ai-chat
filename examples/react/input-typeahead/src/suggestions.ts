/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Title: Canned SuggestionItem fixture for the typeahead example.
 *
 * Demonstrates: the `SuggestionItem` shape (`id` / `label` / `description`)
 * that the AUTOCOMPLETE resolver in `App.tsx` filters and surfaces in the
 * typeahead dropdown.
 *
 * APIs exercised:
 *   - `SuggestionItem` from `@carbon/ai-chat`
 *
 * Start reading at: `CANNED_SUGGESTIONS`.
 */

import { SuggestionItem } from "@carbon/ai-chat";

// Replace with a real production implementation — fixed in-memory list stands in for a search index or backend query.
const CANNED_SUGGESTIONS: SuggestionItem[] = [
  {
    id: "carbon-design",
    label: "What is Carbon Design System?",
    description: "Learn about Carbon's design principles",
  },
  {
    id: "new-component",
    label: "How do I create a new component?",
    description: "Guide to building components",
  },
  {
    id: "design-tokens",
    label: "Tell me about design tokens",
    description: "Understanding design tokens in Carbon",
  },
  {
    id: "accessibility",
    label: "What are the accessibility guidelines?",
    description: "A11y best practices",
  },
  {
    id: "grid-system",
    label: "How do I use the grid system?",
    description: "Layout and responsive grid",
  },
  {
    id: "color-palette",
    label: "Explain the color palette",
    description: "Carbon color usage and themes",
  },
  {
    id: "spacing-scale",
    label: "What is the spacing scale?",
    description: "Consistent spacing with layout tokens",
  },
  {
    id: "contribute",
    label: "How do I contribute to Carbon?",
    description: "Contributing guidelines and process",
  },
];

export { CANNED_SUGGESTIONS };
