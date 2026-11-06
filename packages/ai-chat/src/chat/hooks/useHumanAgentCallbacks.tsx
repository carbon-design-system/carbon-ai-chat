/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback, useMemo } from 'react';
import { HumanAgentCallbacks } from '../services/humanAgentCallbacks';
import type { ChatViewStateSnapshot } from '../services/chatViewState';
import type { FileUpload } from '../../types/state/AppState';
import { useChatViewState, useChatViewStateInstance } from './useChatViewState';

const selectEndChatConfirmationOpen = (snapshot: ChatViewStateSnapshot) =>
  snapshot.endChatConfirmationOpen;

interface UseHumanAgentCallbacksProps {
  isConnectingOrConnected: boolean;
  allowMultipleFileUploads: boolean;
  requestInputFocus: () => void;
}

interface UseHumanAgentCallbacksReturn {
  showEndChatConfirmation: boolean;
  showConfirmEndChat: () => void;
  hideConfirmEndChat: () => void;
  confirmHumanAgentEndChat: () => void;
  onUserTyping: (isTyping: boolean) => void;
  onFilesSelectedForUpload: (uploads: FileUpload[]) => void;
}

/**
 * Custom hook to manage human agent related callbacks
 */
export function useHumanAgentCallbacks({
  isConnectingOrConnected,
  allowMultipleFileUploads,
  requestInputFocus,
}: UseHumanAgentCallbacksProps): UseHumanAgentCallbacksReturn {
  const viewState = useChatViewStateInstance();
  const controller = useMemo(
    () => new HumanAgentCallbacks(viewState),
    [viewState]
  );
  const showEndChatConfirmation = useChatViewState(
    selectEndChatConfirmationOpen
  );
  const onFilesSelectedForUpload = useCallback(
    (uploads: FileUpload[]) =>
      controller.onFilesSelectedForUpload(
        uploads,
        isConnectingOrConnected,
        allowMultipleFileUploads,
        requestInputFocus
      ),
    [
      controller,
      isConnectingOrConnected,
      allowMultipleFileUploads,
      requestInputFocus,
    ]
  );

  return {
    showEndChatConfirmation,
    showConfirmEndChat: controller.showConfirmEndChat,
    hideConfirmEndChat: controller.hideConfirmEndChat,
    confirmHumanAgentEndChat: controller.confirmHumanAgentEndChat,
    onUserTyping: controller.onUserTyping,
    onFilesSelectedForUpload,
  };
}
