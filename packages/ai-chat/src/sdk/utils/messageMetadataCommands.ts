/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from '../services/ServiceManager';
import type {
  MessageRequest,
  MessageRequestHistory,
  MessageResponseHistory,
} from '../../types/messaging/Messages';
import actions from '../store/actions';
import {
  isHumanAgentLocalOwner,
  isHumanAgentMessageOwner,
} from '../store/messageOwnership';

/** Shared renderers keep HAA metadata on its existing synchronous write path. */
export function mergeMessageHistoryFromView(
  serviceManager: ServiceManager,
  messageID: string,
  history: MessageRequestHistory | MessageResponseHistory
) {
  if (isHumanAgentMessageOwner(serviceManager.store, messageID)) {
    serviceManager.store.dispatch(
      actions.mergeMessageHistory(messageID, history)
    );
  } else {
    serviceManager.messageCoordinator.mergeMessageHistory(messageID, history);
  }
}

export function setMessageOptionSelectedFromView(
  serviceManager: ServiceManager,
  localID: string,
  sentMessage: MessageRequest
) {
  if (isHumanAgentLocalOwner(serviceManager.store, localID)) {
    serviceManager.store.dispatch(
      actions.messageSetOptionSelected(localID, sentMessage)
    );
  } else {
    serviceManager.messageCoordinator.setMessageOptionSelected(
      localID,
      sentMessage
    );
  }
}
