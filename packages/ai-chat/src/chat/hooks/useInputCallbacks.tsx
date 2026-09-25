/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from './useSelector';
import {
  selectInputIsReadonly,
  selectInputIsDisabled,
} from '../store/selectors';
import { shallowEqual } from '../store/appStore';
import {
  InputCallbacks,
  requestInputFocus as focusInput,
  shouldDisableInput as inputDisabled,
  shouldDisableSend as sendDisabled,
  selectInputUploads,
  isUploadButtonDisabled,
} from '../services/inputCallbacks';
import type { MessageSendSource } from '../../types/events/eventBusTypes';
import type { ServiceManager } from '../services/ServiceManager';
import type { SendOptions } from '../../types/instance/ChatInstance';
import type { MessagesComponentClass } from '../components-legacy/MessagesComponent';
import type { JSONContent } from '@tiptap/core';

interface UseInputCallbacksProps {
  serviceManager: ServiceManager;
  agentDisplayState: {
    isConnectingOrConnected: boolean;
    disableInput: boolean;
  };
  isHydrated: boolean;
  messagesRef: React.RefObject<MessagesComponentClass | null>;
  humanAgentFileUploadInProgress: boolean;
}

interface UseInputCallbacksReturn {
  onSendInput: (
    text: string,
    source: MessageSendSource,
    options?: SendOptions,
    displayContent?: JSONContent
  ) => Promise<void>;
  onRestart: () => Promise<void>;
  onClose: () => Promise<void>;
  onToggleHomeScreen: () => void;
  onAcceptDisclaimer: () => void;
  requestInputFocus: () => void;
  shouldDisableInput: () => boolean;
  shouldDisableSend: () => boolean;
  showUploadButtonDisabled: boolean;
}

/**
 * Custom hook to manage input and action callbacks
 */
export function useInputCallbacks({
  serviceManager,
  agentDisplayState,
  isHydrated,
  messagesRef,
  humanAgentFileUploadInProgress,
}: UseInputCallbacksProps): UseInputCallbacksReturn {
  const controller = useMemo(
    () =>
      new InputCallbacks(serviceManager, () =>
        messagesRef.current?.doAutoScroll()
      ),
    [serviceManager, messagesRef]
  );
  useEffect(() => controller.disconnect, [controller]);
  const requestInputFocus = useCallback(
    () =>
      focusInput(agentDisplayState, () =>
        messagesRef.current?.requestHumanAgentBannerFocus()
      ),
    [agentDisplayState, messagesRef]
  );
  const isInputReadonly = useSelector(selectInputIsReadonly);
  const isInputDisabled = useSelector(selectInputIsDisabled);
  const shouldDisableInput = useCallback(
    () =>
      inputDisabled(
        isInputReadonly,
        isInputDisabled,
        agentDisplayState.disableInput
      ),
    [isInputReadonly, isInputDisabled, agentDisplayState.disableInput]
  );
  const shouldDisableSend = useCallback(
    () => sendDisabled(shouldDisableInput(), isHydrated),
    [shouldDisableInput, isHydrated]
  );
  const { files, allowMultipleFileUploads } = useSelector(
    selectInputUploads,
    shallowEqual
  );
  return {
    onSendInput: controller.onSendInput,
    onRestart: controller.onRestart,
    onClose: controller.onClose,
    onToggleHomeScreen: controller.onToggleHomeScreen,
    onAcceptDisclaimer: controller.onAcceptDisclaimer,
    requestInputFocus,
    shouldDisableInput,
    shouldDisableSend,
    showUploadButtonDisabled: isUploadButtonDisabled(
      files?.length ?? 0,
      humanAgentFileUploadInProgress,
      allowMultipleFileUploads
    ),
  };
}
