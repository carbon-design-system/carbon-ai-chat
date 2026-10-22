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
import { CDSAIChatHistoryPanelItem } from '../../components/aichat-history/index.js';
import type {
  HistoryItemSelectedEventDetail,
  HistoryMenuActionEventDetail,
  HistoryRenameChangeEventDetail,
  HistoryRenameSaveEventDetail,
} from '../../components/aichat-history/index.js';

const HistoryPanelItem = createComponent({
  tagName: CDSAIChatHistoryPanelItem.is,
  elementClass: CDSAIChatHistoryPanelItem,
  react: React,
  events: {
    onMenuAction: 'history-item-menu-action' as EventName<
      CustomEvent<HistoryMenuActionEventDetail>
    >,
    onSelected: 'history-item-selected' as EventName<
      CustomEvent<HistoryItemSelectedEventDetail>
    >,
    onRenameCancel: 'history-panel-item-input-cancel' as EventName<
      CustomEvent<null>
    >,
    onRenameSave: 'history-panel-item-input-save' as EventName<
      CustomEvent<HistoryRenameSaveEventDetail>
    >,
    onRenameChange: 'history-panel-item-input-change' as EventName<
      CustomEvent<HistoryRenameChangeEventDetail>
    >,
  },
});

export default HistoryPanelItem;
