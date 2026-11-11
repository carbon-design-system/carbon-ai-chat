/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { deepFreeze } from '../../sdk/utils/lang/objectUtils';
import {
  DEFAULT_CUSTOM_PANEL_ID,
  WORKSPACE_CUSTOM_PANEL_ID,
} from '../../sdk/utils/constants';
import {
  DefaultCustomPanelConfigOptions,
  PanelConfigOptionsByType,
  PanelType,
  ViewState,
  WorkspaceCustomPanelConfigOptions,
} from '../../types/instance/apiTypes';
import type { CustomPanelState } from '../../types/state/panels/CustomPanelState';
import type { WorkspacePanelState } from '../../types/state/panels/WorkspacePanelState';
import type { HistoryPanelState } from '../../types/state/panels/HistoryPanelState';
import type { IFramePanelState } from '../../types/state/panels/IFramePanelState';
import type { ViewSourcePanelState } from '../../types/state/panels/ViewSourcePanelState';
import type { MessagePanelState } from '../../types/state/panels/MessagePanelState';

const VIEW_STATE_ALL_CLOSED: ViewState = {
  launcher: false,
  mainWindow: false,
};
deepFreeze(VIEW_STATE_ALL_CLOSED);

const DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS: DefaultCustomPanelConfigOptions = {
  hideBackButton: false,
  disableAnimation: false,
  fullWidth: false,
  backButtonType: 'minimize',
  showChatHeader: false,
  openFromSide: false,
};
deepFreeze(DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS);

const WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS: WorkspaceCustomPanelConfigOptions =
  {
    preferredLocation: 'end',
  };
deepFreeze(WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS);

const PANEL_CONFIG_OPTIONS_BY_TYPE: PanelConfigOptionsByType = {
  [PanelType.DEFAULT]: DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
  [PanelType.WORKSPACE]: WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS,
};
deepFreeze(PANEL_CONFIG_OPTIONS_BY_TYPE);

const DEFAULT_CUSTOM_PANEL_STATE: CustomPanelState = {
  isOpen: false,
  panelID: DEFAULT_CUSTOM_PANEL_ID,
  options: DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
};
deepFreeze(DEFAULT_CUSTOM_PANEL_STATE);

const DEFAULT_WORKSPACE_PANEL_STATE: WorkspacePanelState = {
  isOpen: false,
  workspaceID: undefined,
  panelID: WORKSPACE_CUSTOM_PANEL_ID,
  options: WORKSPACE_CUSTOM_PANEL_CONFIG_OPTIONS,
  localMessageItem: undefined,
  fullMessage: undefined,
  additionalData: undefined,
};
deepFreeze(DEFAULT_WORKSPACE_PANEL_STATE);

const DEFAULT_HISTORY_PANEL_STATE: HistoryPanelState = {
  isOpen: false,
  isMobile: false,
};
deepFreeze(DEFAULT_HISTORY_PANEL_STATE);

const DEFAULT_IFRAME_PANEL_STATE: IFramePanelState = {
  isOpen: false,
  messageItem: null,
};
deepFreeze(DEFAULT_IFRAME_PANEL_STATE);

const DEFAULT_CITATION_PANEL_STATE: ViewSourcePanelState = {
  isOpen: false,
  citationItem: null,
};
deepFreeze(DEFAULT_CITATION_PANEL_STATE);

const DEFAULT_MESSAGE_PANEL_STATE: MessagePanelState<any> = {
  isOpen: false,
  localMessageItem: null,
  isMessageForInput: false,
};

deepFreeze(DEFAULT_MESSAGE_PANEL_STATE);

const VIEW_STATE_LAUNCHER_OPEN: ViewState = {
  launcher: true,
  mainWindow: false,
};
deepFreeze(VIEW_STATE_LAUNCHER_OPEN);

const VIEW_STATE_MAIN_WINDOW_OPEN: ViewState = {
  mainWindow: true,
  launcher: false,
};
deepFreeze(VIEW_STATE_MAIN_WINDOW_OPEN);

export {
  VIEW_STATE_ALL_CLOSED,
  DEFAULT_CUSTOM_PANEL_CONFIG_OPTIONS,
  PANEL_CONFIG_OPTIONS_BY_TYPE,
  DEFAULT_CUSTOM_PANEL_STATE,
  DEFAULT_WORKSPACE_PANEL_STATE,
  DEFAULT_HISTORY_PANEL_STATE,
  DEFAULT_IFRAME_PANEL_STATE,
  DEFAULT_CITATION_PANEL_STATE,
  DEFAULT_MESSAGE_PANEL_STATE,
  VIEW_STATE_LAUNCHER_OPEN,
  VIEW_STATE_MAIN_WINDOW_OPEN,
};
