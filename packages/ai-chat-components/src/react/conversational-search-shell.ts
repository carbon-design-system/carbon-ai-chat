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
import ConversationalSearchShellElement, {
  type CitationToggleEventDetail,
} from '../components/conversational-search/src/conversational-search-shell.js';
import prefix from '../globals/settings.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const ConversationalSearchShell = withWebComponentBridge(
  createComponent({
    tagName: `${prefix}-conversational-search-shell`,
    elementClass: ConversationalSearchShellElement,
    react: React,
    events: {
      onCitationsToggle:
        ConversationalSearchShellElement.eventCitationsToggle as EventName<
          CustomEvent<CitationToggleEventDetail>
        >,
    },
  })
);

export { ConversationalSearchShell };
export default ConversationalSearchShell;
