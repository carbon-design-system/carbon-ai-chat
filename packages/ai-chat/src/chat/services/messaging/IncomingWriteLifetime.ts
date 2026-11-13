/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IncomingWriteState } from './state/IncomingWriteState';

const noop = () => {
  /* intentionally empty */
};

export class IncomingWriteLifetime {
  readonly state = new IncomingWriteState();
  readonly chainByID = new Map<string, Promise<void>>();
  readonly streamingControllers = new Map<string, AbortController>();

  constructor(private restartCount: () => number) {}

  trackWrite(messageID: string) {
    const entry = this.state.pendingWrites.get(messageID) ?? {
      valid: true,
      count: 0,
    };
    entry.count++;
    this.state.pendingWrites.set(messageID, entry);
    const generation = this.state.generation;
    const restartCount = this.restartCount();
    let released = false;
    return {
      isCurrent: () =>
        entry.valid &&
        generation === this.state.generation &&
        restartCount === this.restartCount(),
      release: () => {
        if (released) {
          return;
        }
        released = true;
        entry.count--;
        if (!entry.count && this.state.pendingWrites.get(messageID) === entry) {
          this.state.pendingWrites.delete(messageID);
        }
      },
    };
  }

  enqueue(messageID: string, worker: () => Promise<void>): Promise<void> {
    const generation = this.state.generation;
    const prev = this.chainByID.get(messageID) ?? Promise.resolve();
    const next = prev.catch(noop).then(() => {
      if (generation === this.state.generation) {
        return worker();
      }
      return undefined;
    });
    this.chainByID.set(messageID, next);
    // Detach a finalization handler that cleans up the chain entry. The trailing
    // `.then(noop, noop)` absorbs the rejection so it isn't reported as unhandled —
    // the original caller still sees the rejection via the returned `next`.
    next
      .finally(() => {
        if (this.chainByID.get(messageID) === next) {
          this.chainByID.delete(messageID);
        }
      })
      .then(noop, noop);
    return next;
  }
}
