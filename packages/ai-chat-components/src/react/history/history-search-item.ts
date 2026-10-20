/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';
import { CDSAIChatHistorySearchItem } from '../../components/aichat-history/index.js';
import type { HistoryItemSelectedEventDetail } from '../../components/aichat-history/index.js';

const HistorySearchItem = createComponent({
  tagName: CDSAIChatHistorySearchItem.is,
  elementClass: CDSAIChatHistorySearchItem,
  react: React,
  events: {
    onSelected: 'history-search-item-selected' as EventName<
      CustomEvent<HistoryItemSelectedEventDetail>
    >,
  },
});

export default HistorySearchItem;
