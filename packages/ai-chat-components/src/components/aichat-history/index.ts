/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '../../globals/register.js';
import '../aichat-button/index.js';
import CDSAIChatHistoryToolbar from './aichat-history-toolbar.js';
import CDSAIChatHistoryContent from './aichat-history-content.js';
import CDSAIChatHistoryPanel from './aichat-history-panel.js';
import CDSAIChatHistorySearchItem from './aichat-history-search-item.js';
import CDSAIChatHistoryPanelItemInput from './aichat-history-panel-item-input.js';
import CDSAIChatHistoryDeletePanel from './aichat-history-delete-panel.js';
import CDSAIChatHistoryLoading from './aichat-history-loading.js';
import CDSAIChatHistoryPanelItems from './aichat-history-panel-items.js';
import CDSAIChatHistoryPanelItem from './aichat-history-panel-item.js';
import CDSAIChatHistoryPanelMenu from './aichat-history-panel-menu.js';
import CDSAIChatHistoryHeader from './aichat-history-header.js';
import CDSAIChatHistoryShell from './aichat-history-shell.js';

export {
  CDSAIChatHistoryToolbar,
  CDSAIChatHistoryContent,
  CDSAIChatHistoryPanel,
  CDSAIChatHistorySearchItem,
  CDSAIChatHistoryPanelItemInput,
  CDSAIChatHistoryDeletePanel,
  CDSAIChatHistoryLoading,
  CDSAIChatHistoryPanelItems,
  CDSAIChatHistoryPanelItem,
  CDSAIChatHistoryPanelMenu,
  CDSAIChatHistoryHeader,
  CDSAIChatHistoryShell,
};

defineCustomElement(CDSAIChatHistoryToolbar);
defineCustomElement(CDSAIChatHistoryContent);
defineCustomElement(CDSAIChatHistoryPanel);
defineCustomElement(CDSAIChatHistorySearchItem);
defineCustomElement(CDSAIChatHistoryPanelItemInput);
defineCustomElement(CDSAIChatHistoryDeletePanel);
defineCustomElement(CDSAIChatHistoryLoading);
defineCustomElement(CDSAIChatHistoryPanelItems);
defineCustomElement(CDSAIChatHistoryPanelItem);
defineCustomElement(CDSAIChatHistoryPanelMenu);
defineCustomElement(CDSAIChatHistoryHeader);
defineCustomElement(CDSAIChatHistoryShell);

export type { HistorySearchInputEventDetail } from './aichat-history-toolbar.js';

export type { HistoryRenameChangeEventDetail } from './aichat-history-panel-item-input.js';

export type { HistoryRenameSaveEventDetail } from './aichat-history-panel-item-input.js';

export type { HistoryDeleteConfirmEventDetail } from './aichat-history-delete-panel.js';

export type { HistoryItemSelectedEventDetail } from './aichat-history-panel-item.js';

export type { HistoryMenuActionEventDetail } from './aichat-history-panel-item.js';
