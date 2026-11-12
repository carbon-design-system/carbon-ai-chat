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

import { PromptLineShellElement } from '../components/aichat-prompt-line/index.js';
import type { AutocompleteNavigatedEventDetail } from '../components/aichat-prompt-line/index.js';

/**
 * React wrapper for `<cds-aichat-prompt-line-shell>`. The shell is layout-only —
 * named slots plus the `rounded` flag. It reports autocomplete navigation
 * state without prop transformations. Consumers compose `<PromptLine>`,
 * autocomplete content, file-uploads, send-control, etc. into the named
 * slots themselves.
 */
const PromptLineShell = createComponent({
  tagName: PromptLineShellElement.is,
  elementClass: PromptLineShellElement,
  react: React,
  events: {
    onAutocompleteNavigated: 'cds-aichat-autocomplete-navigated' as EventName<
      CustomEvent<AutocompleteNavigatedEventDetail>
    >,
  },
});

export default PromptLineShell;
