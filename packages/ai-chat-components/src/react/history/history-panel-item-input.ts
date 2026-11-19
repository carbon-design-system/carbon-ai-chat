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
import { CDSAIChatHistoryPanelItemInput } from '../../components/aichat-history/index.js';
import type {
  HistoryRenameChangeEventDetail,
  HistoryRenameSaveEventDetail,
} from '../../components/aichat-history/index.js';

const HistoryPanelItemInput = createComponent({
  tagName: CDSAIChatHistoryPanelItemInput.is,
  elementClass: CDSAIChatHistoryPanelItemInput,
  react: React,
  events: {
    onChange: 'history-panel-item-input-change' as EventName<
      CustomEvent<HistoryRenameChangeEventDetail>
    >,
    onCancel: 'history-panel-item-input-cancel' as EventName<CustomEvent<null>>,
    onSave: 'history-panel-item-input-save' as EventName<
      CustomEvent<HistoryRenameSaveEventDetail>
    >,
  },
});

export default HistoryPanelItemInput;
