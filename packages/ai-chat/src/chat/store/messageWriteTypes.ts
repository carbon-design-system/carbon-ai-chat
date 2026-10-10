/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { LocalMessageItem } from '../../types/messaging/LocalMessageItem';
import type {
  GenericItem,
  MessageRequest,
} from '../../types/messaging/Messages';
import type { DeepPartial } from '../../types/utilities/DeepPartial';

/**
 * What the chat's own callers of the upsert path pass along with a write. The public
 * `upsertMessage` never passes it.
 */
interface MessageWriteOptions {
  /** The public method the write comes from. Unset means `upsertMessage`. */
  origin?: 'addMessage' | 'chunk';

  /**
   * For a streaming write with `origin: 'chunk'`, the item the chunk carries: the host's
   * `partial_item` or `complete_item` itself.
   */
  chunk?: { item: DeepPartial<GenericItem>; isComplete: boolean };

  /**
   * For a write from `addMessage` or `final_response`: whether the message is a new
   * welcome message, which marks its items as welcome responses.
   */
  isLatestWelcomeNode?: boolean;

  /**
   * For a write from `addMessage` or `final_response`: the request the message answers.
   * The message's `request_id` is set to its id, or cleared when there is none.
   */
  requestMessage?: MessageRequest;

  /**
   * For a write from `addMessage` or `final_response`: the restart count when the caller
   * began. The write is dropped when a restart happened since.
   */
  restartCount?: number;

  /** Set by the coordinator on a write from `addMessage` or `final_response`. */
  received?: ReceivedLocalItems;
}

/**
 * A write from `addMessage` or `final_response`, which shows its message the way
 * `addMessage` always has. The first write stores the message and carries no item. Each
 * later write shows one item.
 */
interface ReceivedLocalItems {
  /** The item a later write shows. */
  localItem?: LocalMessageItem;

  /** The items nested in `localItem`. Always set when `localItem` is set. */
  nestedLocalItems: LocalMessageItem[];

  /** The id of the item the message showed before `localItem`, which it goes after. */
  addAfterID?: string;
}

export type { MessageWriteOptions, ReceivedLocalItems };
