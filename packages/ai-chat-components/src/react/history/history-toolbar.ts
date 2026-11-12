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
import { CDSAIChatHistoryToolbar } from '../../components/aichat-history/index.js';
import type { HistorySearchInputEventDetail } from '../../components/aichat-history/index.js';

const HistoryToolbar = createComponent({
  tagName: CDSAIChatHistoryToolbar.is,
  elementClass: CDSAIChatHistoryToolbar,
  react: React,
  events: {
    onSearchInput: 'cds-search-input' as EventName<
      CustomEvent<HistorySearchInputEventDetail>
    >,
    onNewChatClick: 'chat-history-new-chat-click' as EventName<
      CustomEvent<null>
    >,
  },
});

export default HistoryToolbar;
