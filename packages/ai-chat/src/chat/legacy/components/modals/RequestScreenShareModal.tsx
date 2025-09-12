/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { ConfirmModal } from "./ConfirmModal";
import { ScreenShareState } from "../../../../types/config/ServiceDeskConfig";

/**
 * Displays a modal asking if the user wants to end a chat with an agent. This also covers the case where the user
 * cancels a request for an agent before an agent has joined.
 */
function RequestScreenShareModal() {
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();

  const onConfirm = () => {
    serviceManager.humanAgentService?.screenShareUpdateRequestState(
      ScreenShareState.ACCEPTED,
    );
  };

  const onCancel = () => {
    serviceManager.humanAgentService?.screenShareUpdateRequestState(
      ScreenShareState.DECLINED,
    );
  };

  const title = languagePack.agent_sharingRequestTitle;
  const message = languagePack.agent_sharingRequestMessage;
  const cancelButtonLabel = languagePack.agent_sharingDeclineButton;
  const confirmButtonLabel = languagePack.agent_sharingAcceptButton;

  return (
    <ConfirmModal
      title={title}
      message={message}
      onConfirm={onConfirm}
      onCancel={onCancel}
      cancelButtonLabel={cancelButtonLabel}
      confirmButtonLabel={confirmButtonLabel}
      modalAnnounceMessage={message}
      serviceManager={serviceManager}
    />
  );
}

export { RequestScreenShareModal };
