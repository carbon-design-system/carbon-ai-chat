/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../store/actions';
import {
  selectInputState,
  selectIsInputToHumanAgent,
} from '../store/selectors';
import { createMessageRequestForText } from '../utils/messageUtils';
import { shouldSendSilently } from '../utils/fileAttachments';
import {
  BusEventType,
  MessageSendSource,
} from '../../types/events/eventBusTypes';
import type { ServiceManager } from './ServiceManager';
import type { AppState } from '../../types/state/AppState';
import type { SendOptions } from '../../types/instance/ChatInstance';
import type { JSONContent } from '@tiptap/core';

export class InputCallbacks {
  private scrollTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    private serviceManager: ServiceManager,
    private scrollMessages: () => void
  ) {}

  disconnect = () => {
    this.scrollTimers.forEach(clearTimeout);
    this.scrollTimers.clear();
  };

  onSendInput = async (
    text: string,
    source: MessageSendSource,
    options?: SendOptions,
    displayContent?: JSONContent
  ) => {
    const currentState = this.serviceManager.store.getState();
    const isInputToHumanAgent = selectIsInputToHumanAgent(currentState);
    const { files, pendingStructuredData } = selectInputState(currentState);
    if (isInputToHumanAgent) {
      this.serviceManager.humanAgentService.sendMessageToAgent(
        text,
        files,
        displayContent
      );
    } else {
      const messageRequest = createMessageRequestForText(text, displayContent);
      this.serviceManager.actions.sendWithCatch(messageRequest, source, {
        ...options,
        silent:
          options?.silent ?? shouldSendSilently(text, pendingStructuredData),
      });
    }
    if (files.length) {
      this.serviceManager.store.dispatch(
        actions.clearInputFiles(isInputToHumanAgent)
      );
    }
  };

  onRestart = async () => {
    await this.serviceManager.actions.restartConversation();
  };

  onClose = async () => {
    await this.serviceManager.actions.changeView('launcher' as any, {
      viewChangeReason: 'main_window_minimized' as any,
      mainWindowCloseReason: 'default_minimize' as any,
    });
  };

  onToggleHomeScreen = () => {
    const willShowMessages =
      this.serviceManager.store.getState().persistedToBrowserStorage
        .homeScreenState.isHomeScreenOpen;
    this.serviceManager.store.dispatch(actions.toggleHomeScreen());
    if (willShowMessages) {
      const timer = setTimeout(() => {
        this.scrollTimers.delete(timer);
        this.scrollMessages();
      }, 0);
      this.scrollTimers.add(timer);
    }
  };

  onAcceptDisclaimer = () => {
    this.serviceManager.store.dispatch(actions.acceptDisclaimer());
    this.serviceManager.fire({ type: BusEventType.DISCLAIMER_ACCEPTED });
  };
}

export function requestInputFocus(
  agentDisplayState: {
    isConnectingOrConnected: boolean;
    disableInput: boolean;
  },
  focusHumanAgentBanner: () => void
) {
  try {
    if (
      agentDisplayState.isConnectingOrConnected &&
      agentDisplayState.disableInput
    ) {
      focusHumanAgentBanner();
    }
  } catch (error) {
    console.error('An error occurred in requestInputFocus', error);
  }
}

export function shouldDisableInput(
  isReadonly: boolean,
  isDisabled: boolean,
  agentDisablesInput: boolean
) {
  return isReadonly || isDisabled || agentDisablesInput;
}

export function shouldDisableSend(inputDisabled: boolean, isHydrated: boolean) {
  return inputDisabled || !isHydrated;
}

export function selectInputUploads(state: AppState) {
  const { files, allowMultipleFileUploads } = selectInputState(state);
  return { files, allowMultipleFileUploads };
}

export function isUploadButtonDisabled(
  numFiles: number,
  uploadInProgress: boolean,
  allowMultipleFileUploads: boolean
) {
  return (numFiles > 0 || uploadInProgress) && !allowMultipleFileUploads;
}
