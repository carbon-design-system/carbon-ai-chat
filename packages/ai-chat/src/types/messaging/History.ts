/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageRequest, MessageResponse } from "./Messages";

/**
 * The types here describe the history structure.
 * This is used currently for session history and is planned to be reused by the history.
 */

/**
 * A single interaction in the Session History.
 *
 * @category Messaging
 */
export interface HistoryItem {
  /**
   * The message represented by this history item.
   */
  message: MessageRequest | MessageResponse;

  /**
   * Time this message occurred. ISO Format (e.g. 2020-03-15T08:59:56.952Z).
   */
  time: string;
}

/**
 * Holds all the conversation between a User and a human or virtual agent.
 * @category Messaging
 */
export interface HistoryNote {
  body: HistoryItem[];
}
