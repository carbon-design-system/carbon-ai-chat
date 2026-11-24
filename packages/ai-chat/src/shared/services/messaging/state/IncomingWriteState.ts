/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MessageState } from '../../../../types/config/MessagingConfig';

export class IncomingWriteState {
  generation = 0;

  /**
   * Receive-dedup record, **not** a liveness record. `addMessage` and `addMessageChunk`
   * write it too, it deliberately retains {@link MessageState.COMPLETE} for the life of
   * the session, and nothing drains it when a stream is canceled. Use
   * {@link streamingIDs} to ask whether a message is still streaming.
   */
  readonly stateByID = new Map<string, MessageState>();

  /**
   * IDs currently mid-stream via `upsertMessage`. The native write flow
   * adds on {@link MessageState.STREAMING} and removes on {@link MessageState.COMPLETE} /
   * {@link MessageState.ERROR}, so the two operations stay symmetric and the set cannot
   * leak the way {@link stateByID} does.
   */
  readonly streamingIDs = new Set<string>();

  /**
   * How many of each message's `pause` items have run, counted in `output.generic`
   * order, so a later upsert of the same message never runs one again. `Infinity` when
   * `addMessage` or history delivered the message, since they run its pauses themselves.
   */
  readonly pausesRunByID = new Map<string, number>();

  readonly pendingWrites = new Map<string, { valid: boolean; count: number }>();
}
