/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// This module has no imports, so anything may use it.

/** Reads one value and hears when it changes. Both methods work unbound. */
interface ReadableValueStore<T> {
  /** The current value. The same reference until a listener is notified. */
  get: () => T;

  /**
   * Calls `listener` with each new value. It isn't called for the value
   * current at subscription. The returned function removes this
   * subscription only, even when the same function is subscribed twice.
   */
  subscribe: (listener: (value: T) => void) => () => void;
}

/** A {@link ReadableValueStore} its owner can write. */
interface ValueStore<T> extends ReadableValueStore<T> {
  /**
   * Stores `next`. A value equal by `Object.is` changes nothing and notifies
   * nobody. A different one notifies each listener once. A listener that
   * writes again stops the rest of this round, because that write already
   * gave every listener the newer value. A listener that throws stops the
   * round too: the value is already stored, and the rest hear of the next
   * change.
   */
  set: (next: T) => void;
}

/** Creates a store holding `initial`. */
function createValueStore<T>(initial: T): ValueStore<T> {
  let value = initial;
  let version = 0;
  // An object per subscription, so each unsubscribe removes only its own.
  const subscriptions = new Set<{ listener: (value: T) => void }>();

  const get = () => value;

  const subscribe = (listener: (value: T) => void) => {
    const subscription = { listener };
    subscriptions.add(subscription);
    return () => {
      subscriptions.delete(subscription);
    };
  };

  const set = (next: T) => {
    if (Object.is(value, next)) {
      return;
    }
    value = next;
    const written = ++version;
    for (const subscription of [...subscriptions]) {
      if (version !== written) {
        return;
      }
      // Skip one removed by an earlier listener in this round.
      if (subscriptions.has(subscription)) {
        subscription.listener(next);
      }
    }
  };

  return Object.freeze({ get, subscribe, set });
}

export { createValueStore };
export type { ReadableValueStore, ValueStore };
