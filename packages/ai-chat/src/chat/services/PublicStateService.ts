/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import { selectHasInFlightUpload, selectInputState } from '../store/selectors';
import { deepFreeze } from '../utils/lang/objectUtils';
import { PublicChatState } from '../../types/instance/PublicChatState';
import type { JSONContent } from '@tiptap/core';
import type { ServiceManager } from './ServiceManager';

class PublicStateService {
  private serviceManager: ServiceManager;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  getPublicChatState(): PublicChatState {
    const state = this.serviceManager.store.getState();
    const { persistedToBrowserStorage, assistantMessageState } = state;

    const persistedSnapshot = deepFreeze(cloneDeep(persistedToBrowserStorage));

    const { humanAgentState, ...rest } = persistedSnapshot;

    const humanAgent = deepFreeze({
      ...humanAgentState,
      isConnecting: state.humanAgentState.isConnecting,
    });

    const inputState = selectInputState(state);
    // `content` is mirrored into Redux on every input-change event as
    // Tiptap-native JSONContent so it reads quickly without traversing
    // the live editor. Cache the cloned-and-frozen result keyed on the
    // Redux reference so unrelated dispatches don't pay the deep-clone cost.
    const inputActionsService = this.serviceManager.inputActionsService;
    let inputContent: JSONContent;
    if (inputState.content) {
      if (
        inputActionsService.cachedInputContentSource === inputState.content &&
        inputActionsService.cachedInputContentClone
      ) {
        inputContent = inputActionsService.cachedInputContentClone;
      } else {
        inputContent = deepFreeze(cloneDeep(inputState.content));
        inputActionsService.cachedInputContentSource = inputState.content;
        inputActionsService.cachedInputContentClone = inputContent;
      }
    } else {
      inputContent = {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      } as JSONContent;
    }
    const input = deepFreeze({
      rawValue: inputState.rawValue ?? '',
      content: inputContent,
      focused: Boolean(inputState.focused),
      structuredData: inputState.pendingStructuredData
        ? cloneDeep(inputState.pendingStructuredData)
        : undefined,
      hasInFlightUploads: selectHasInFlightUpload(state),
    });

    const customPanels = deepFreeze({
      default: {
        isOpen: Boolean(state.customPanelState.isOpen),
      },
      workspace: {
        isOpen: Boolean(state.workspacePanelState.isOpen),
        options: {
          preferredLocation:
            state.workspacePanelState.options.preferredLocation,
        },
        workspaceID: state.workspacePanelState.workspaceID,
        additionalData: state.workspacePanelState.additionalData,
      },
      history: {
        isOpen: Boolean(state.historyPanelState.isOpen),
        isMobile: Boolean(state.historyPanelState.isMobile),
      },
    });

    const workspace = deepFreeze({
      isOpen: Boolean(state.workspacePanelState.isOpen),
      options: {
        preferredLocation: state.workspacePanelState.options.preferredLocation,
      },
      workspaceID: state.workspacePanelState.workspaceID,
      additionalData: state.workspacePanelState.additionalData,
    });

    const history = deepFreeze({
      isOpen: Boolean(state.historyPanelState.isOpen),
      isMobile: Boolean(state.historyPanelState.isMobile),
    });

    return deepFreeze({
      ...rest,
      humanAgent,
      isMessageLoadingCounter: assistantMessageState.isMessageLoadingCounter,
      isMessageLoadingText: assistantMessageState.isMessageLoadingText,
      isHydratingCounter: assistantMessageState.isHydratingCounter,
      activeResponseId: assistantMessageState.activeResponseId ?? null,
      input,
      customPanels,
      workspace,
      history,
    });
  }
}

export { PublicStateService };
