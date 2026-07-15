/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Adapter helpers that normalize chat-input suggestion configs from the
 * React-friendly shape (React icon components on items) into the shape the
 * Carbon Tiptap factories expect (`CarbonIcon` objects). Used by React
 * consumers before calling `buildCarbonExtensions` or rendering autocomplete
 * lists.
 */

import { transformReactIconToCarbonIcon } from "../../globals/utils/iconTransform.js";
import type {
  AutocompleteConfig,
  SuggestionItem,
  TriggerSuggestionConfig,
} from "../../components/input/src/tiptap/types.js";

const ICON_SIZE = 16;

/**
 * Transforms a single SuggestionItem's avatar to CarbonIcon format when a
 * a React component was supplied.
 */
export function transformItemIcon(item: SuggestionItem): SuggestionItem {
  if (!item.avatar || typeof item.avatar === "string") {
    return item;
  }
  return {
    ...item,
    avatar: transformReactIconToCarbonIcon(item.avatar, ICON_SIZE),
  };
}

type SuggestionItemsField =
  | SuggestionItem[]
  | ((query: string) => Promise<SuggestionItem[]> | SuggestionItem[]);

function transformItemsField(
  items: SuggestionItemsField,
): SuggestionItemsField {
  if (Array.isArray(items)) {
    return items.map(transformItemIcon);
  }
  return async (query: string) => {
    const resolved = await items(query);
    return resolved.map(transformItemIcon);
  };
}

/**
 * Returns a copy of the given suggestion config with item icons normalized.
 * `undefined` passes through.
 */
export function transformSuggestionConfig<
  T extends TriggerSuggestionConfig | AutocompleteConfig,
>(config: T | undefined): T | undefined {
  if (!config) {
    return config;
  }
  return { ...config, items: transformItemsField(config.items) } as T;
}

/** Returns a copy of the starter items array with icons normalized. */
export function transformStarterItems(
  starters: SuggestionItem[] | undefined,
): SuggestionItem[] | undefined {
  if (!starters) {
    return starters;
  }
  return starters.map(transformItemIcon);
}
