/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

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

export type { ChatMessagesState };
