/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { SuggestionItem } from './types.js';

/**
 * Shared resolver for BaseSuggestionConfig items: applies minQueryLength
 * gating, delegates to the async function or filters the static array.
 * Used by AutocompleteController — the canonical resolution path.
 *
 * When `items` is a static array, the default filter matches any item whose
 * label contains the query (case-insensitive). Pass `items` as a function to
 * use a different matching strategy.
 */
export async function resolveConfigItems(
  config: {
    items:
      | SuggestionItem[]
      | ((query: string) => Promise<SuggestionItem[]> | SuggestionItem[]);
    minQueryLength?: number;
  },
  query: string
): Promise<SuggestionItem[]> {
  const minQueryLength = config.minQueryLength ?? 0;
  if (query.length < minQueryLength) {
    return [];
  }
  if (typeof config.items === 'function') {
    return await Promise.resolve(config.items(query));
  }
  if (!query) {
    return config.items;
  }
  const lower = query.toLowerCase();
  return config.items.filter((item) =>
    item.label.toLowerCase().includes(lower)
  );
}
