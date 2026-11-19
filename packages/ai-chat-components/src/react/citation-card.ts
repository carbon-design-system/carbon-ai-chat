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
import { CitationCard as CitationCardElement } from '../components/aichat-conversational-search/index.js';
import type { CitationCardEventDetail } from '../components/aichat-conversational-search/index.js';

const CitationCard = createComponent({
  tagName: CitationCardElement.is,
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
});

export { CitationCard };
export default CitationCard;
