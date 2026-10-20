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
import { CDSAIChatHistoryShell } from '../../components/aichat-history/index.js';
import type { HistoryItemSelectedEventDetail } from '../../components/aichat-history/index.js';

const HistoryShell = createComponent({
  tagName: CDSAIChatHistoryShell.is,
  elementClass: CDSAIChatHistoryShell,
  react: React,
  events: {
    onSelected: 'history-item-selected' as EventName<
      CustomEvent<HistoryItemSelectedEventDetail>
    >,
  },
});

export default HistoryShell;
