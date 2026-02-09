/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { useSelector } from "../../hooks/useSelector";

import { useLanguagePack } from "../../hooks/useLanguagePack";
import { useServiceManager } from "../../hooks/useServiceManager";
import { AppState } from "../../../types/state/AppState";
import { ConfirmModal, ConfirmModalButtonProps } from "./ConfirmModal";

interface EndHumanAgentChatModalProps extends ConfirmModalButtonProps {
  /**
   * The title for the modal.
   */
  title?: string;

  /**
   * The message to display in the confirmation modal to explain to the user the purpose of this confirmation.
   */
  message?: string;
}

/**
 * Displays a modal asking if the user wants to end a chat with an agent. This also covers the case where the user
 * cancels a request for an agent before an agent has joined.
 */
function EndHumanAgentChatModal(props: EndHumanAgentChatModalProps) {
  const { onConfirm, onCancel, title, message } = props;
  const languagePack = useLanguagePack();
  const serviceManager = useServiceManager();
  const { isConnected, isSuspended } = useSelector(
    (state: AppState) => state.persistedToBrowserStorage.humanAgentState,
  );

  const useTitle =
    title ||
    (isConnected
      ? languagePack.agent_endChat
      : languagePack.agent_confirmCancelRequestTitle);
  const useMessage =
    message ||
    (isConnected
      ? languagePack.agent_confirmEndChat
      : languagePack.agent_confirmCancelRequestMessage);
  const cancelButtonLabel = languagePack.agent_confirmEndChatNo;

  let confirmButtonLabel: string;
  if (isSuspended) {
    confirmButtonLabel = languagePack.agent_confirmEndSuspendedYes;
  } else if (isConnected) {
    confirmButtonLabel = languagePack.agent_confirmEndChatYes;
  } else {
    confirmButtonLabel = languagePack.agent_confirmCancelRequestYes;
  }

  return (
    <ConfirmModal
      title={useTitle}
      message={useMessage}
      onConfirm={onConfirm}
      onCancel={onCancel}
      cancelButtonLabel={cancelButtonLabel}
      confirmButtonLabel={confirmButtonLabel}
      modalAnnounceMessage={useMessage}
      serviceManager={serviceManager}
    />
  );
}

export { EndHumanAgentChatModal };
