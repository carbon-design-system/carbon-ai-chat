/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../aichat-card/index.js';
import { defineCustomElement } from '../../globals/register.js';
import CitationCard from './aichat-citation-card.js';
import ConversationalSearchShell from './aichat-conversational-search-shell.js';

export { CitationCard, ConversationalSearchShell };
export type { CitationCardEventDetail } from './aichat-citation-card.js';
export type {
  CitationToggleEventDetail,
  CitationsSelectEventDetail,
} from './aichat-conversational-search-shell.js';

defineCustomElement(ConversationalSearchShell);
defineCustomElement(CitationCard);
