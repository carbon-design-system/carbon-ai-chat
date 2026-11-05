/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { BusEventType } from '../events/eventBusTypes';
import type { ChatSDKInstanceMessaging } from '../config/ChatSDKInstanceMessaging';
import type { ChatInstanceServiceDeskActions } from './ChatInstanceServiceDeskActions';
import type { TypeAndHandler } from './EventHandlers';
import type { ChatSDKStateAccess } from './ChatSDKState';

/**
 * The 18 events a conversation fires with no interface, and the only ones {@link ChatSDKInstance.on}
 * accepts. {@link ChatInstance} accepts every {@link BusEventType}, so the interface events stay
 * available to a prebuilt chat.
 *
 * {@link BusEventType.CHUNK_USER_DEFINED_RESPONSE} is not here, because it fires only from
 * {@link ChatInstanceMessaging.addMessageChunk}. {@link BusEventType.USER_DEFINED_RESPONSE} is here,
 * because {@link ChatSDKInstanceMessaging.upsertMessage} fires it for a user-defined item.
 * {@link BusEventType.CHAT_READY} is not here, because a conversation with no interface is ready
 * when it is handed to you.
 *
 * @category SDK
 */
export type ChatSDKEventType =
  // Messages
  | BusEventType.PRE_SEND
  | BusEventType.SEND
  | BusEventType.PRE_RECEIVE
  | BusEventType.RECEIVE
  | BusEventType.USER_DEFINED_RESPONSE
  | BusEventType.STOP_STREAMING
  // Lifecycle
  | BusEventType.HISTORY_BEGIN
  | BusEventType.HISTORY_END
  | BusEventType.PRE_RESTART_CONVERSATION
  | BusEventType.RESTART_CONVERSATION
  // Human agents
  | BusEventType.HUMAN_AGENT_PRE_RECEIVE
  | BusEventType.HUMAN_AGENT_RECEIVE
  | BusEventType.HUMAN_AGENT_PRE_SEND
  | BusEventType.HUMAN_AGENT_SEND
  | BusEventType.HUMAN_AGENT_PRE_START_CHAT
  | BusEventType.HUMAN_AGENT_PRE_END_CHAT
  | BusEventType.HUMAN_AGENT_END_CHAT
  | BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE;

/**
 * The handler or handlers passed to {@link ChatSDKInstance.on}, {@link ChatSDKInstance.off}, and
 * {@link ChatSDKInstance.once}. Each handler registers for one {@link ChatSDKEventType} and receives
 * {@link ChatSDKInstance}.
 *
 * @category SDK
 */
export type ChatSDKHandlers =
  | TypeAndHandler<ChatSDKInstance, ChatSDKEventType>
  | TypeAndHandler<ChatSDKInstance, ChatSDKEventType>[];

/**
 * A conversation with no interface members: messaging, human agent actions, state, and conversation
 * events. {@link ChatInstance} extends it, so a prebuilt chat has all of this too.
 *
 * Code written against this type works with any chat, because it uses no view, panel, input, or
 * focus member. A `createChatSDK` function that starts a conversation with no interface arrives with
 * the `@carbon/ai-chat/sdk` entry point in 2.0.0.
 *
 * @category SDK
 */
export interface ChatSDKInstance {
  /**
   * Messaging actions for the conversation.
   */
  messaging: ChatSDKInstanceMessaging;

  /**
   * Actions that are related to a service desk integration.
   */
  serviceDesk: ChatInstanceServiceDeskActions;

  /**
   * Reads and observes immutable state snapshots of the conversation.
   */
  readonly state: ChatSDKStateAccess;

  /**
   * Adds the given event handler as a listener for events of the given type. Only conversation
   * events are accepted; see {@link ChatSDKEventType}.
   *
   * @param handlers The handler or handlers along with the event type to start listening for events.
   * @returns The instance for method chaining.
   *
   * @example Listen for received messages
   * ```ts
   * import { BusEventType, type BusEventReceive } from "@carbon/ai-chat";
   *
   * instance.on({
   *   type: BusEventType.RECEIVE,
   *   handler: (event) => console.log((event as BusEventReceive).data.id),
   * });
   * ```
   */
  on(handlers: ChatSDKHandlers): this;

  /**
   * Removes an event listener that was previously added via {@link ChatSDKInstance.on} or
   * {@link ChatSDKInstance.once}.
   *
   * @param handlers The handler or handlers along with the event type to stop listening for events.
   * @returns The instance for method chaining.
   *
   * @example Remove a previously registered handler
   * ```ts
   * import { BusEventType, type BusEvent, type BusEventReceive } from "@carbon/ai-chat";
   *
   * // off requires the same handler reference passed to on.
   * const onReceive = (event: BusEvent) =>
   *   console.log((event as BusEventReceive).data.id);
   * instance.on({ type: BusEventType.RECEIVE, handler: onReceive });
   * instance.off({ type: BusEventType.RECEIVE, handler: onReceive });
   * ```
   */
  off(handlers: ChatSDKHandlers): this;

  /**
   * Adds the given event handler as a listener for events of the given type. After the first event is
   * handled, this handler is removed.
   *
   * @param handlers The handler or handlers along with the event type to start listening for an event.
   * @returns The instance for method chaining.
   *
   * @example Run a handler only for the first restart
   * ```ts
   * import { BusEventType } from "@carbon/ai-chat";
   *
   * instance.once({
   *   type: BusEventType.RESTART_CONVERSATION,
   *   handler: () => console.log("conversation restarted"),
   * });
   * ```
   */
  once(handlers: ChatSDKHandlers): this;
}
