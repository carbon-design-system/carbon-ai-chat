/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKInstanceMessaging } from '../../types/config/ChatSDKInstanceMessaging';
import { MessageSendSource } from '../../types/events/eventBusTypes';
import type { SendOptions } from '../../types/instance/ChatInstance';
import type { ChatInstanceServiceDeskActions } from '../../types/instance/ChatInstanceServiceDeskActions';
import type { TypeAndHandler } from '../../types/instance/EventHandlers';
import type { HistoryItem } from '../../types/messaging/History';
import type { MessageRequest } from '../../types/messaging/Messages';
import { selectInputIsReadonly } from '../store/selectors';
import { debugLog } from '../utils/miscUtils';
import type { ServiceManager } from './ServiceManager';

/**
 * Builds the conversation members of a chat's instance: what `createChatSDK`'s
 * handle and the prebuilt chat's `ChatInstance` share. `self` is the object
 * `on`, `off`, and `once` return, so each caller chains on its own object.
 */
function createConversationInstance<Self>(
  serviceManager: ServiceManager,
  self: () => Self
) {
  const { publicStateService } = serviceManager;
  const messaging: ChatSDKInstanceMessaging = {
    send: async (message: MessageRequest | string, options?: SendOptions) => {
      debugLog('Called instance.messaging.send', message, options);
      if (selectInputIsReadonly(serviceManager.store.getState())) {
        throw new Error('You are unable to send messages in read only mode.');
      }
      return serviceManager.actions.send(
        message,
        MessageSendSource.INSTANCE_SEND,
        options
      );
    },

    stop: () => {
      debugLog('Called instance.messaging.stop');
      return serviceManager.messageCoordinator.stop();
    },

    upsertMessage: async (messageID, state, updater) => {
      debugLog('Called instance.messaging.upsertMessage', messageID, state);
      const { restartCount } = serviceManager;
      try {
        await serviceManager.messageCoordinator.upsertMessage(
          messageID,
          state,
          updater
        );
      } catch (error) {
        if (restartCount === serviceManager.restartCount) {
          serviceManager.messageCoordinator.messageLoadingManager.end();
        }
        throw error;
      }
    },

    removeMessages: async (messageIDs: string[]) => {
      debugLog('Called instance.messaging.removeMessages', messageIDs);
      return serviceManager.actions.removeMessages(messageIDs);
    },

    clearConversation: () => {
      debugLog('Called instance.messaging.clearConversation');
      return serviceManager.actions.restartConversation({
        skipHydration: true,
        endHumanAgentConversation: false,
        fireEvents: false,
      });
    },

    insertHistory: (messages: HistoryItem[]) => {
      debugLog('Called instance.messaging.insertHistory', messages);
      return serviceManager.actions.insertHistory(messages);
    },

    restartConversation: async () => {
      debugLog('Called instance.messaging.restartConversation');
      return serviceManager.actions.restartConversation();
    },
  };
  const serviceDesk: ChatInstanceServiceDeskActions = {
    endConversation: () => {
      debugLog('Called instance.serviceDesk.endConversation');
      return serviceManager.actions.agentEndConversation(false);
    },

    updateIsSuspended: async (isSuspended: boolean) => {
      debugLog('Called instance.serviceDesk.updateIsSuspended', isSuspended);
      return serviceManager.actions.agentUpdateIsSuspended(isSuspended);
    },
  };
  return {
    state: {
      get: publicStateService.get,
      subscribe: publicStateService.subscribe,
      select: publicStateService.select,
    },

    on: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      serviceManager.eventBus.on(handlers);
      return self();
    },

    off: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      serviceManager.eventBus.off(handlers);
      return self();
    },

    once: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      serviceManager.eventBus.once(handlers);
      return self();
    },

    messaging,
    serviceDesk,
  };
}

export { createConversationInstance };
