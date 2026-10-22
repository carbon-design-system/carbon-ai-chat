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
import { ConversationalSearchShell as ConversationalSearchShellElement } from '../components/aichat-conversational-search/index.js';
import { type CitationToggleEventDetail } from '../components/aichat-conversational-search/aichat-conversational-search-shell.js';

const ConversationalSearchShell = createComponent({
  tagName: ConversationalSearchShellElement.is,
  elementClass: ConversationalSearchShellElement,
  react: React,
  events: {
    onCitationsToggle:
      ConversationalSearchShellElement.eventCitationsToggle as EventName<
        CustomEvent<CitationToggleEventDetail>
      >,
  },
});

export { ConversationalSearchShell };
export default ConversationalSearchShell;
