/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BaseMessageInput,
  EventInput,
  MessageRequest,
  MessageResponse,
} from "./Messages";

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
  message:
    | MessageRequest<BaseMessageInput>
    | MessageRequest<EventInput>
    | MessageResponse;

  /**
   * Time this message occurred. ISO Format (e.g. 2020-03-15T08:59:56.952Z).
   */
  time: string;
}

/**
 * Holds all the conversation between a User and a human or virtual agent.
 *
 * @category Messaging
 */
export type SessionHistory = HistoryItem[];

/**
 * Denotes the type of note.
 *
 * @category Messaging
 */
export enum NoteType {
  /**
   * Represents the history of the conversation. The only type currently used by Web chat client.
   */
  HISTORY = "HISTORY",

  /**
   * Arbitrary text or/and image to presented to the human agent.
   */
  MESSAGE = "MESSAGE",

  /**
   * An non multi-turn Answer.
   */
  ANSWER = "ANSWER",

  /**
   * A multi-turn suggestion that an agent can approve or reject.
   */
  FLOW = "FLOW",

  /**
   * An error message to be presented to the human agent.
   */
  ERROR = "ERROR",
}

/**
 * Information about a conversation is provided as Notes.
 * A typical use case is the session history that is consumed by both Web Chat client and Agent App within a service
 * desk. More use cases are messages with information that is valuable to the Human Agent but it is not part of the
 * history of the conversation. Previously, with backdoor integrations, there was also support for suggestions notes to
 * the agent. This form of notes may be introduced in the future for front door integrations but currently are not in
 * use.
 *
 * @category Messaging
 */
export interface Note {
  type: NoteType;
}

/**
 * @category Messaging
 */
export interface HistoryNote extends Note {
  body: SessionHistory;
}
