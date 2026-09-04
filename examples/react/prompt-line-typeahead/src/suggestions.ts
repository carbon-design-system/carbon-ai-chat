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
 * Demonstrates: the `SuggestionItem` shape (`id` / `label` / `description` /
 * `groupId` / `groupTitle`) that the AUTOCOMPLETE resolver in `App.tsx`
 * filters and surfaces in the typeahead dropdown. Items sharing the same
 * `groupId` are rendered under a group heading; items without one are flat.
 *
 * APIs exercised:
 *   - `SuggestionItem` from `@carbon/ai-chat`
 *
 * Start reading at: `CANNED_SUGGESTIONS`.
 */

import { SuggestionItem } from '@carbon/ai-chat';

// Replace with a real production implementation — fixed in-memory list stands
// in for a search index or backend query.
const CANNED_SUGGESTIONS: SuggestionItem[] = [
  {
    id: 'carbon-design',
    label: 'What is Carbon Design System?',
    description: "Learn about Carbon's design principles",
    groupId: 'group-1',
    groupTitle: 'Domain A',
  },
  {
    id: 'new-component',
    label: 'How do I create a new component?',
    description: 'Guide to building components',
    groupId: 'group-1',
    groupTitle: 'Domain A',
  },
  {
    id: 'design-tokens',
    label: 'Tell me about design tokens',
    description: 'Understanding design tokens in Carbon',
    groupId: 'group-2',
    groupTitle: 'Domain B',
  },
  {
    id: 'accessibility',
    label: 'What are the accessibility guidelines?',
    description: 'A11y best practices',
    groupId: 'group-2',
    groupTitle: 'Domain B',
  },
  {
    id: 'grid-system',
    label: 'How do I use the grid system?',
    description: 'Layout and responsive grid',
    groupId: 'group-3',
    groupTitle: 'Domain C',
  },
  {
    id: 'color-palette',
    label: 'Explain the color palette',
    description: 'Carbon color usage and themes',
    groupId: 'group-3',
    groupTitle: 'Domain C',
  },
  {
    id: 'spacing-scale',
    label: 'What is the spacing scale?',
    description: 'Consistent spacing with layout tokens',
    groupId: 'group-3',
    groupTitle: 'Domain C',
  },
  {
    id: 'contribute',
    label: 'How do I contribute to Carbon?',
    description: 'Contributing guidelines and process',
    groupId: 'group-3',
    groupTitle: 'Domain C',
  },
];

export { CANNED_SUGGESTIONS };
