/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EditorView } from "prosemirror-view";

import {
  insertToken as pmInsertToken,
  replaceWithText,
} from "./prosemirror/commands.js";
import type { EditorViewManager } from "./editor-view-manager.js";
import {
  SuggestionType,
  type SuggestionConfig,
  type SuggestionItem,
  type TriggerChangeEventDetail,
} from "./types.js";

/**
 * Applies a user-selected suggestion to the editor.
 *
 * Two insertion modes, determined by the active trigger's type:
 *  - `"starter"` / `"autocomplete"` → the suggestion replaces the entire input
 *    text. Used for fully-templated messages (e.g. canned prompts). `item.value`
 *    takes precedence over `item.label` so consumers can show a friendly label
 *    while submitting a different string.
 *  - `"mention"` / `"command"` → the trigger + query is replaced with a styled
 *    token node via the trigger plugin's command.
 *
 * Looked up here rather than in the caller so both the autocomplete-select
 * path and the imperative `insertToken()` public API share one policy.
 *
 * @param view - The ProseMirror EditorView
 * @param item - The suggestion item to insert
 * @param triggerState - The current trigger state
 * @param suggestionConfigs - Array of suggestion configurations
 * @param manager - EditorViewManager for proper focus handling
 */
export function insertAutocompleteItem(
  view: EditorView,
  item: SuggestionItem,
  triggerState: TriggerChangeEventDetail | null,
  suggestionConfigs: SuggestionConfig[],
  manager: EditorViewManager,
): void {
  if (
    triggerState?.type === SuggestionType.STARTER ||
    triggerState?.type === SuggestionType.AUTOCOMPLETE
  ) {
    const text = (item.value as string) || item.label;
    replaceWithText(view, text, manager);
    return;
  }

  const config = findTokenConfig(suggestionConfigs, triggerState?.type);
  if (config) {
    pmInsertToken(view, item, config, manager);
  }
}

/**
 * Imperative token insertion (public-API variant). The caller supplies the
 * raw string to insert; `triggerState` is still consulted to pick the right
 * suggestion config (mention vs command etc).
 *
 * @param view - The ProseMirror EditorView
 * @param item - The suggestion item to insert
 * @param rawValue - The raw value to insert
 * @param triggerState - The current trigger state
 * @param suggestionConfigs - Array of suggestion configurations
 * @param manager - EditorViewManager for proper focus handling
 */
export function insertTokenWithRawValue(
  view: EditorView,
  item: SuggestionItem,
  rawValue: string,
  triggerState: TriggerChangeEventDetail | null,
  suggestionConfigs: SuggestionConfig[],
  manager: EditorViewManager,
): void {
  const config = findTokenConfig(suggestionConfigs, triggerState?.type);
  if (config) {
    pmInsertToken(view, { ...item, value: rawValue }, config, manager);
  }
}

function findTokenConfig(
  configs: SuggestionConfig[],
  type: string | undefined,
) {
  if (type !== SuggestionType.MENTION && type !== SuggestionType.COMMAND) {
    return undefined;
  }
  return configs.find((c) => c.type === type) as
    | (SuggestionConfig & { type: typeof type })
    | undefined;
}
