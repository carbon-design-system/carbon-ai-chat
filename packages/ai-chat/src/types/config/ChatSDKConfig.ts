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
   * This is a one-off listener for catastrophic errors. This is used instead of a normal event bus handler because this function can be
   * defined and called before the event bus has been created.
   */
  onError?: (data: ChatSDKErrorData) => void;

  /**
   * Add a bunch of noisy console.log messages!
   */
  debug?: boolean;

  /**
   * This is a factory for producing custom implementations of service desks. If this value is set, then this will
   * be used to create an instance of a {@link ServiceDesk} when the user attempts to connect to an agent.
   *
   * If it is changed in the middle of a conversation (you should obviously avoid this) the conversation with the
   * human agent will be disconnected.
   *
   * This factory is compared by reference. Provide a stable reference (for example
   * a module-level function or a memoized `useCallback`); a new function identity
   * on every render is treated as a change and, while an agent chat is active, tears
   * down and rebuilds the service desk connection.
   */
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters<I>
  ) => Promise<ServiceDesk>;

  /**
   * Any public config to apply to service desks.
   */
  serviceDesk?: ChatSDKServiceDeskConfig;

  /**
   * An optional namespace that can be added to the Carbon AI Chat that must be 30 characters or under. This value is
   * intended to enable multiple instances of the Carbon AI Chat to be used on the same page. The namespace for this web
   * chat. This value is used to generate a value to append to anything unique (id, session keys, etc) to allow
   * multiple Carbon AI Chats on the same page.
   *
   * Note: this value is used in the aria region label for the Carbon AI Chat. This means this value will be read out loud
   * by users using a screen reader.
   */
  namespace?: string;

  /**
   * Config options for controlling messaging.
   */
  messaging?: ChatSDKConfigMessaging<I>;

  /**
   * Sets the chat into a read only mode for displaying old conversations.
   */
  isReadonly?: boolean;

  /**
   * Saves and restores the human agent connection, so a reload can reconnect to a live human agent
   * conversation. Only the connection is saved; the conversation's messages come back through
   * {@link ChatSDKConfigMessaging.customLoadHistory}.
   */
  humanAgentState?: ChatSDKPersistedStateConfig<PersistedHumanAgentState>;
}
