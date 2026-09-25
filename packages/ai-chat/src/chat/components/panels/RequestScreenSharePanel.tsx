/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';

import { useSelector } from '../../hooks/useSelector';
import { useServiceManager } from '../../hooks/useServiceManager';
import { ConfirmPanel } from './ConfirmPanel';
import { ScreenShareState } from '../../../types/config/ServiceDeskConfig';
import { shallowEqual } from '../../store/appStore';
import { AppState } from '../../../types/state/AppState';

function RequestScreenSharePanel({ open }: { open: boolean }) {
  const serviceManager = useServiceManager();
  const languagePack = useSelector(
    (state: AppState) => ({
      agent_sharingRequestTitle: state.languagePack.agent_sharingRequestTitle,
      agent_sharingRequestMessage:
        state.languagePack.agent_sharingRequestMessage,
      agent_sharingDeclineButton: state.languagePack.agent_sharingDeclineButton,
      agent_sharingAcceptButton: state.languagePack.agent_sharingAcceptButton,
    }),
    shallowEqual
  );

  const onConfirm = () => {
    serviceManager.humanAgentService?.screenShareUpdateRequestState(
      ScreenShareState.ACCEPTED
    );
  };

  const onCancel = () => {
    serviceManager.humanAgentService?.screenShareUpdateRequestState(
      ScreenShareState.DECLINED
    );
  };

  const title = languagePack.agent_sharingRequestTitle;
  const message = languagePack.agent_sharingRequestMessage;
  const cancelButtonLabel = languagePack.agent_sharingDeclineButton;
  const confirmButtonLabel = languagePack.agent_sharingAcceptButton;

  return (
    <ConfirmPanel
      open={open}
      priority={75}
      title={title}
      message={message}
      onConfirm={onConfirm}
      onCancel={onCancel}
      cancelButtonLabel={cancelButtonLabel}
      confirmButtonLabel={confirmButtonLabel}
      announceMessage={message}
    />
  );
}

export { RequestScreenSharePanel };
