/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';
import { AutocompleteElement } from '../components/aichat-autocomplete/index.js';
import type {
  AutocompleteSelectEventDetail,
  AutocompleteSendEventDetail,
  AutocompleteNavigatedEventDetail,
} from '../components/aichat-autocomplete/index.js';

// TODO: Icon transformation for suggestion items is handled upstream in prompt-line-shell.tsx.
// When icon rendering is added to the autocomplete web component, no additional
// React-side transformation is needed here.
const CDSAIChatAutocomplete = createComponent({
  tagName: AutocompleteElement.is,
  elementClass: AutocompleteElement,
  react: React,
  events: {
    onSelect: 'cds-aichat-autocomplete-select' as EventName<
      CustomEvent<AutocompleteSelectEventDetail>
    >,
    onSend: 'cds-aichat-autocomplete-send' as EventName<
      CustomEvent<AutocompleteSendEventDetail>
    >,
    onDismiss: 'cds-aichat-autocomplete-dismiss' as EventName<
      CustomEvent<null>
    >,
    onAutocompleteNavigated: 'cds-aichat-autocomplete-navigated' as EventName<
      CustomEvent<AutocompleteNavigatedEventDetail>
    >,
  },
});

export default CDSAIChatAutocomplete;
