/**
 * @license
 * Copyright IBM Corp. 2026
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';
import { AutocompleteControllerElement } from '../components/aichat-prompt-line/index.js';
import type {
  SendEventDetail,
  AutocompleteSelectEventDetail,
  AutocompleteSendEventDetail,
  AutocompleteNavigatedEventDetail,
  CustomListRenderEventDetail,
} from '../components/aichat-prompt-line/index.js';

/** Opt-in element wrapper. Callback arguments are DOM events. */
const AutocompleteController = createComponent({
  tagName: AutocompleteControllerElement.is,
  elementClass: AutocompleteControllerElement,
  react: React,
  events: {
    onStarterSelected: 'cds-aichat-starter-selected' as EventName<
      CustomEvent<SendEventDetail>
    >,
    onSelectItem: 'cds-aichat-autocomplete-item-selected' as EventName<
      CustomEvent<AutocompleteSelectEventDetail>
    >,
    onSendItem: 'cds-aichat-autocomplete-item-send' as EventName<
      CustomEvent<AutocompleteSendEventDetail>
    >,
    onListNavigated: 'cds-aichat-list-navigated' as EventName<
      CustomEvent<AutocompleteNavigatedEventDetail>
    >,
    onAutocompleteNavigated: 'cds-aichat-autocomplete-navigated' as EventName<
      CustomEvent<AutocompleteNavigatedEventDetail>
    >,
    onCustomListRender: 'cds-aichat-custom-list-render' as EventName<
      CustomEvent<CustomListRenderEventDetail>
    >,
  },
});

export { AutocompleteController };
export default AutocompleteController;
