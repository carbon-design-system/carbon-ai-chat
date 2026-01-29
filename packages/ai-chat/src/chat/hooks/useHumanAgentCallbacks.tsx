/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback, useState } from "react";
import type { ServiceManager } from "../services/ServiceManager";
import type { FileUpload } from "../../types/state/AppState";
import type { InputFunctions } from "../components-legacy/input/Input";

interface UseHumanAgentCallbacksProps {
  serviceManager: ServiceManager;
  inputRef: React.RefObject<InputFunctions | null>;
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
  serviceManager,
  inputRef,
  isConnectingOrConnected,
  allowMultipleFileUploads,
  requestInputFocus,
}: UseHumanAgentCallbacksProps): UseHumanAgentCallbacksReturn {
  const [showEndChatConfirmation, setShowEndChatConfirmation] = useState(false);

  const showConfirmEndChat = useCallback(() => {
    setShowEndChatConfirmation(true);
  }, []);

  const hideConfirmEndChat = useCallback(() => {
    setShowEndChatConfirmation(false);
    setTimeout(() => {
      inputRef.current?.takeFocus();
    });
  }, [inputRef]);

  const confirmHumanAgentEndChat = useCallback(() => {
    hideConfirmEndChat();
    serviceManager.humanAgentService.endChat(true);
  }, [hideConfirmEndChat, serviceManager]);

  const onUserTyping = useCallback(
    (isTyping: boolean) => {
      if (
        serviceManager.store.getState().persistedToBrowserStorage
          .humanAgentState.isConnected
      ) {
        serviceManager.humanAgentService.userTyping(isTyping);
      }
    },
    [serviceManager],
  );

  const onFilesSelectedForUpload = useCallback(
    (uploads: FileUpload[]) => {
      if (isConnectingOrConnected) {
        serviceManager.humanAgentService.filesSelectedForUpload(uploads);
        if (!allowMultipleFileUploads) {
          requestInputFocus();
        }
      }
    },
    [
      isConnectingOrConnected,
      allowMultipleFileUploads,
      requestInputFocus,
      serviceManager,
    ],
  );

  return {
    showEndChatConfirmation,
    showConfirmEndChat,
    hideConfirmEndChat,
    confirmHumanAgentEndChat,
    onUserTyping,
    onFilesSelectedForUpload,
  };
}

// Made with Bob
