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
import ConversationalSearchTextElement, {
  type CitationToggleEventDetail,
} from '../components/conversational-search-text/src/conversational-search-text.js';
import prefix from '../globals/settings.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const ConversationalSearchText = withWebComponentBridge(
  createComponent({
    tagName: `${prefix}-conversational-search-text`,
    elementClass: ConversationalSearchTextElement,
    react: React,
    events: {
      onCitationsToggle:
        ConversationalSearchTextElement.eventCitationsToggle as EventName<
          CustomEvent<CitationToggleEventDetail>
        >,
      onCitationsScroll:
        ConversationalSearchTextElement.eventCitationsScroll as EventName<CustomEvent>,
    },
  })
);

export { ConversationalSearchText };
export default ConversationalSearchText;
