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
import CitationCardElement, {
  type CitationCardEventDetail,
} from '../components/conversational-search/src/citation-card.js';
import prefix from '../globals/settings.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const CitationCard = withWebComponentBridge(
  createComponent({
    tagName: `${prefix}-citation-card`,
    elementClass: CitationCardElement,
    react: React,
    events: {
      onCitationSelect: CitationCardElement.eventCitationSelect as EventName<
        CustomEvent<CitationCardEventDetail>
      >,
      onCitationExpand: CitationCardElement.eventCitationExpand as EventName<
        CustomEvent<CitationCardEventDetail>
      >,
    },
  })
);

export { CitationCard };
export default CitationCard;
