/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKInstance } from '../instance/ChatSDKInstance';
import type { PersistedHumanAgentState } from '../state/PersistedHumanAgentState';
import type { ChatSDKConfigMessaging } from './ChatSDKConfigMessaging';
import type { ChatSDKErrorData } from './ChatSDKErrorData';
import type { ChatSDKPersistedStateConfig } from './ChatSDKPersistedStateConfig';
import type { ChatSDKServiceDeskConfig } from './ChatSDKServiceDeskConfig';
import type {
  ServiceDesk,
  ServiceDeskFactoryParameters,
} from './ServiceDeskConfig';

/**
 * The configuration of a conversation with no interface. A setting belongs here when the conversation
 * behaves differently without it, even with nothing drawn. {@link PublicConfig} extends it with every
 * interface setting.
 *
 * A callback written for this config works unchanged on {@link PublicConfig}. A callback that uses an
 * interface member, such as {@link ChatInstance.requestFocus}, fails to compile here.
 *
 * A `createChatSDK` function that starts a conversation with no interface arrives with the
 * `@carbon/ai-chat/sdk` entry point in 2.0.0.
 *
 * @typeParam I The instance every callback receives. Defaults to {@link ChatSDKInstance};
 * {@link PublicConfig} passes {@link ChatInstance}.
 * @category SDK
 */
export interface ChatSDKConfig<I extends ChatSDKInstance = ChatSDKInstance> {
  /**
   * Called when a serious error occurs. Unlike an event handler, it can be called before the event
   * bus exists.
   */
  onError?: (data: ChatSDKErrorData) => void;

  /**
   * Logs detailed messages to the console.
   */
  debug?: boolean;

  /**
   * Creates the {@link ServiceDesk} that connects the user to a human agent, when the conversation
   * asks for one.
   *
   * If it changes during a human agent conversation, that conversation is disconnected. The factory
   * is compared by reference, so pass a stable function rather than a new one each time.
   */
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters<I>
  ) => Promise<ServiceDesk>;

  /**
   * Settings for the service desk.
   */
  serviceDesk?: ChatSDKServiceDeskConfig;

  /**
   * Separates this chat from other chats on the same page. It is added to everything that must be
   * unique, such as session keys. Must be 30 characters or fewer.
   */
  namespace?: string;

  /**
   * Settings for sending messages and loading history.
   */
  messaging?: ChatSDKConfigMessaging<I>;

  /**
   * Blocks sending, for displaying a past conversation.
   */
  isReadonly?: boolean;

  /**
   * Saves and restores the human agent connection, so a reload can reconnect to a live human agent
   * conversation. Only the connection is saved; the conversation's messages come back through
   * {@link ChatSDKConfigMessaging.customLoadHistory}.
   */
  humanAgentState?: ChatSDKPersistedStateConfig<PersistedHumanAgentState>;
}
