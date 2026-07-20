/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { LocalMessageItem } from "../messaging/LocalMessageItem";
import ObjectMap from "../utilities/ObjectMap";
import type { Message } from "../messaging/Messages";

/**
 * The state information for a specific instance of a chat panel that contains a list of messages.
 */
interface ChatMessagesState {
  /**
   * An array of local message item ids to correctly store the order of messages.
   */
  localMessageIDs: string[];

  /**
   * An array of message ids to correctly store the order of messages.
   */
  messageIDs: string[];

  /**
   * The id of the most recently active response (including streaming).
   */
  activeResponseId: string | null;

  /**
   * Counter that indicates if a message is loading and a loading indicator should be displayed.
   * If "0" then we do not show loading indicator.
   */
  isMessageLoadingCounter: number;

  /**
   * Optional string to display next to the loading indicator.
   */
  isMessageLoadingText?: string;

  /**
   * Counter that indicates if the chat is hydrating and a full screen loading state should be displayed.
   */
  isHydratingCounter: number;
}

/**
 * The message-related portion of AppState. Used for message history operations.
 */
interface AppStateMessages {
  /**
   * This is the global map/registry of all the local message items by their IDs.
   */
  allMessageItemsByID: ObjectMap<LocalMessageItem>;

  /**
   * This is the global map/registry of all full messages by their message IDs.
   */
  allMessagesByID: ObjectMap<Message>;

  /**
   * The state of messages when the user is interacting with the assistant.
   */
  assistantMessageState: ChatMessagesState;
}

export type { ChatMessagesState, AppStateMessages };
