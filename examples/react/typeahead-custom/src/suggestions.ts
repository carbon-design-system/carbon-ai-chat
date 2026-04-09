/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { SuggestionItem } from "@carbon/ai-chat";

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
