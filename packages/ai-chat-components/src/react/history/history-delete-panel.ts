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
import { CDSAIChatHistoryDeletePanel } from '../../components/aichat-history/index.js';
import type { HistoryDeleteConfirmEventDetail } from '../../components/aichat-history/index.js';

const HistoryDeletePanel = createComponent({
  tagName: CDSAIChatHistoryDeletePanel.is,
  elementClass: CDSAIChatHistoryDeletePanel,
  react: React,
  events: {
    onCancel: 'history-delete-cancel' as EventName<CustomEvent<null>>,
    onConfirm: 'history-delete-confirm' as EventName<
      CustomEvent<HistoryDeleteConfirmEventDetail>
    >,
  },
});

export default HistoryDeletePanel;
