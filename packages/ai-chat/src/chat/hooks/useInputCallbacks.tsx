/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback, useMemo } from "react";
import actions from "../store/actions";
import {
  selectIsInputToHumanAgent,
  selectInputState,
} from "../store/selectors";
import { createMessageRequestForText } from "../utils/messageUtils";
import {
  BusEventType,
  MessageSendSource,
} from "../../types/events/eventBusTypes";
import type { ServiceManager } from "../services/ServiceManager";
import type { AppState, InputState } from "../../types/state/AppState";
import type { SendOptions } from "../../types/instance/ChatInstance";
import type { MessagesComponentClass } from "../components-legacy/MessagesComponent";

interface UseInputCallbacksProps {
  serviceManager: ServiceManager;
  appState: AppState;
  inputState: InputState;
  agentDisplayState: {
    isConnectingOrConnected: boolean;
    disableInput: boolean;
  };
  isHydrated: boolean;
  messagesRef: React.RefObject<MessagesComponentClass | null>;
}

interface UseInputCallbacksReturn {
  onSendInput: (
    text: string,
    source: MessageSendSource,
    options?: SendOptions,
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
  appState,
  inputState,
  agentDisplayState,
  isHydrated,
  messagesRef,
}: UseInputCallbacksProps): UseInputCallbacksReturn {
  const onSendInput = useCallback(
    async (text: string, source: MessageSendSource, options?: SendOptions) => {
      const isInputToHumanAgent = selectIsInputToHumanAgent(appState);
      const state = serviceManager.store.getState();
      const { files } = selectInputState(state);

      if (isInputToHumanAgent) {
        serviceManager.humanAgentService.sendMessageToAgent(text, files);
      } else {
        const messageRequest = createMessageRequestForText(text);
        serviceManager.actions.sendWithCatch(messageRequest, source, {
          ...options,
          // When the user sends with no text (e.g. file-only), mark the message
          // silent so it is not rendered as an empty bubble in the chat UI.
          // An explicit silent:true/false from the caller is always preserved.
          silent: options?.silent ?? !text,
        });
      }

      if (files.length) {
        serviceManager.store.dispatch(
          actions.clearInputFiles(isInputToHumanAgent),
        );
      }
    },
    [appState, serviceManager],
  );

  const onRestart = useCallback(async () => {
    await serviceManager.actions.restartConversation();
  }, [serviceManager]);

  const onClose = useCallback(async () => {
    await serviceManager.actions.changeView("launcher" as any, {
      viewChangeReason: "main_window_minimized" as any,
      mainWindowCloseReason: "default_minimize" as any,
    });
  }, [serviceManager]);

  const onToggleHomeScreen = useCallback(() => {
    const currentState = serviceManager.store.getState();
    const willShowMessages =
      currentState.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen;

    serviceManager.store.dispatch(actions.toggleHomeScreen());

    // Auto-scroll when returning to messages
    if (willShowMessages) {
      // Use setTimeout to ensure the toggle completes before scrolling
      setTimeout(() => {
        messagesRef.current?.doAutoScroll();
      }, 0);
    }
  }, [serviceManager, messagesRef]);

  const onAcceptDisclaimer = useCallback(() => {
    serviceManager.store.dispatch(actions.acceptDisclaimer());
    serviceManager.fire({
      type: BusEventType.DISCLAIMER_ACCEPTED,
    });
  }, [serviceManager]);

  const requestInputFocus = useCallback(() => {
    try {
      if (
        agentDisplayState.isConnectingOrConnected &&
        agentDisplayState.disableInput
      ) {
        if (messagesRef.current?.requestHumanAgentBannerFocus()) {
          return;
        }
      }
      // Input focus will be handled by parent component
    } catch (error) {
      console.error("An error occurred in requestInputFocus", error);
    }
  }, [agentDisplayState, messagesRef]);

  const shouldDisableInput = useCallback(() => {
    return (
      inputState.isReadonly ||
      inputState.isDisabled ||
      agentDisplayState.disableInput
    );
  }, [
    inputState.isReadonly,
    inputState.isDisabled,
    agentDisplayState.disableInput,
  ]);

  const shouldDisableSend = useCallback(() => {
    return shouldDisableInput() || !isHydrated;
  }, [shouldDisableInput, isHydrated]);

  const showUploadButtonDisabled = useMemo(() => {
    const numFiles = inputState.files?.length ?? 0;
    const anyCurrentFiles =
      numFiles > 0 || appState.humanAgentState.fileUploadInProgress;
    return anyCurrentFiles && !inputState.allowMultipleFileUploads;
  }, [
    inputState.files,
    inputState.allowMultipleFileUploads,
    appState.humanAgentState.fileUploadInProgress,
  ]);

  return {
    onSendInput,
    onRestart,
    onClose,
    onToggleHomeScreen,
    onAcceptDisclaimer,
    requestInputFocus,
    shouldDisableInput,
    shouldDisableSend,
    showUploadButtonDisabled,
  };
}

// Made with Bob
