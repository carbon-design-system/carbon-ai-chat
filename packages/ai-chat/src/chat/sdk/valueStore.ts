/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A framework-agnostic, value-holding subscribable. Unlike the app store (which notifies every
 * listener on any dispatch), a value store notifies only its own subscribers and only when its
 * value actually changes. A remounting subscriber gets the current value for free on its first
 * `get()`, so host-projection state (slot portals) survives a remount without setter repointing.
 *
 * The `get`/`subscribe` pair is `useSyncExternalStore`-compatible: `subscribe(listener)` registers
 * a change callback and returns an unsubscribe; `get()` returns the current snapshot.
 */
export interface ReadableValueStore<T> {
  /** Returns the current value. */
  get(): T;
  /** Registers a change listener; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

/**
 * A {@link ReadableValueStore} that can also be written. `set` accepts a next value or an updater
 * that receives the previous value; a value equal (`Object.is`) to the current one is a no-op and
 * does not notify.
 */
export interface ValueStore<T> extends ReadableValueStore<T> {
  /** Replaces the value (or derives it from the previous value); notifies on a real change. */
  set(next: T | ((previous: T) => T)): void;
}

/**
 * Creates a {@link ValueStore} seeded with `initial`. Backed by a `Set` of listeners; `set` skips
 * notification when the next value is `Object.is`-equal to the current one.
 */
export function createValueStore<T>(initial: T): ValueStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    get(): T {
      return value;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: T | ((previous: T) => T)): void {
      const nextValue =
        typeof next === "function" ? (next as (previous: T) => T)(value) : next;
      if (Object.is(nextValue, value)) {
        return;
      }
      value = nextValue;
      listeners.forEach((listener) => listener());
    },
  };
}
