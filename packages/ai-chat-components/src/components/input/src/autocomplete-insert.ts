/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EditorView } from "prosemirror-view";

import {
  insertToken as pmInsertToken,
  replaceWithText,
} from "./prosemirror/commands.js";
import type {
  SuggestionConfig,
  SuggestionItem,
  TriggerChangeEventDetail,
} from "./types.js";

/**
 * Applies a user-selected suggestion to the editor.
 *
 * Two insertion modes, determined by the active trigger's type:
 *  - `"autocomplete"` → the suggestion replaces the entire input text. Used for
 *    fully-templated messages (e.g. canned prompts). `item.value` takes
 *    precedence over `item.label` so consumers can show a friendly label while
 *    submitting a different string.
 *  - anything else (e.g. `"mention"`, `"command"`) → the trigger + query is
 *    replaced with a styled token node via the trigger plugin's command.
 *
 * Looked up here rather than in the caller so both the autocomplete-select
 * path and the imperative `insertToken()` public API share one policy.
 */
export function insertAutocompleteItem(
  view: EditorView,
  item: SuggestionItem,
  triggerState: TriggerChangeEventDetail | null,
  suggestionConfigs: SuggestionConfig[],
): void {
  if (triggerState?.type === "autocomplete") {
    const text = (item.value as string) || item.label;
    replaceWithText(view, text);
    return;
  }

  const config = suggestionConfigs.find((c) => c.type === triggerState?.type);
  if (config) {
    pmInsertToken(view, item, config);
  }
}

/**
 * Imperative token insertion (public-API variant). The caller supplies the
 * raw string to insert; `triggerState` is still consulted to pick the right
 * suggestion config (mention vs command etc).
 */
export function insertTokenWithRawValue(
  view: EditorView,
  item: SuggestionItem,
  rawValue: string,
  triggerState: TriggerChangeEventDetail | null,
  suggestionConfigs: SuggestionConfig[],
): void {
  const config = suggestionConfigs.find((c) => c.type === triggerState?.type);
  if (config) {
    pmInsertToken(view, { ...item, value: rawValue }, config);
  }
}
