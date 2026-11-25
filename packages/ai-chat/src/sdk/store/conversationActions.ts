/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ADD_LOCAL_MESSAGE_ITEM,
  HYDRATE_MESSAGE_HISTORY,
  REMOVE_MESSAGES,
  RESTART_CONVERSATION,
  UPSERT_MESSAGE,
} from './messageActionTypes';
import {
  MESSAGE_SET_OPTION_SELECTED,
  RESET_PERSISTED_STATE,
  UPDATE_PERSISTED_STATE,
} from './actions';
import { HA_SET_IS_CONNECTING } from './humanAgentActions';

/**
 * The conversation actions a store partition may react to, so one dispatch
 * updates both partitions. Each one states a conversation fact; none is a view
 * instruction.
 */
const conversationActions = {
  /** The conversation was cleared. */
  RESTART_CONVERSATION,
  /**
   * History was loaded: `{ messageHistory, insertsHistory, optionsSelected }`,
   * where `optionsSelected` maps a local item's ID to the request its chosen
   * option sent.
   */
  HYDRATE_MESSAGE_HISTORY,
  /** A local item was added: `{ messageItem, message }`. */
  ADD_LOCAL_MESSAGE_ITEM,
  /** A message was written: `{ message, isStreaming, options }`. */
  UPSERT_MESSAGE,
  /** Messages were removed: `{ messageIDs }`. */
  REMOVE_MESSAGES,
  /**
   * The user chose an option, date, or post-back button in a local item, which
   * sent a request: `{ messageID, sentMessage }`, where `messageID` is the
   * local item's ID.
   */
  MESSAGE_SET_OPTION_SELECTED,
  /** An agent chat started or stopped connecting: `{ isConnecting }`. */
  HA_SET_IS_CONNECTING,
  /** Saved state went back to its defaults: `{ keepOpenState }`. */
  RESET_PERSISTED_STATE,
  /** Saved fields were set: `{ chatState }`, any saved field. */
  UPDATE_PERSISTED_STATE,
} as const;

export { conversationActions };
