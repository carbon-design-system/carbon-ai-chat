/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register.js';
import AutocompleteElement from './aichat-autocomplete.js';

export { default as AutocompleteElement } from './aichat-autocomplete.js';
export { defaultAutocompleteI18n } from './aichat-autocomplete.js';
export type {
  HeaderConfig,
  AutocompleteI18n,
  AutocompleteSelectEventDetail,
  AutocompleteSendEventDetail,
  AutocompleteNavigatedEventDetail,
  SuggestionItem,
  SuggestionItemGroup,
} from './aichat-autocomplete.js';

defineCustomElement(AutocompleteElement);
