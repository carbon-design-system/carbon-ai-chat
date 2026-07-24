/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "./src/autocomplete.js";
import "./src/autocomplete-item.js";
import "./src/autocomplete-item-group.js";

export { default as AutocompleteElement } from "./src/autocomplete.js";
export { default as AutocompleteItemElement } from "./src/autocomplete-item.js";
export { default as AutocompleteItemGroupElement } from "./src/autocomplete-item-group.js";
export { defaultAutocompleteI18n } from "./src/autocomplete.js";
export type {
  HeaderConfig,
  AutocompleteI18n,
  AutocompleteSelectEventDetail,
  AutocompleteSendEventDetail,
  SuggestionItem,
  SuggestionItemGroup,
} from "./src/autocomplete.js";
