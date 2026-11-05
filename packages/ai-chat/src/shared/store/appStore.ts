/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { commitMessageOwnership } from './messageOwnership';
import { debugLog, isEnableDebugLog } from '../utils/miscUtils';

/**
 * Compatibility and design notes
 *
 * The lightweight store in this file is inspired by the public Redux store API but does not depend on Redux.
 * It exists to reduce external dependencies and keep the public API shape predictable for our internal usage.
 *
 * References (MIT licenses):
 * - Redux: https://github.com/reduxjs/redux (License: https://github.com/reduxjs/redux/blob/master/LICENSE.md)
 * - react-redux: https://github.com/reduxjs/react-redux (License: https://github.com/reduxjs/react-redux/blob/master/LICENSE.md)
 */

/**
 * A generic action interface compatible with Redux-like stores.
 * Using `unknown` for payload fields keeps type safety without resorting to `any`.
 */
export interface UnknownAction {
  /** Type string identifying the action. */
  type: string;
  /** Additional action properties. */

  [extraProperty: string]: unknown;
}

/**
 * A reducer transforms a state value based on an action.
 *
 * @typeParam StateShape - The shape of the state managed by the reducer.
 * @typeParam ActionType - The action type handled by the reducer.
 * @param state - The current immutable state value.
 * @param action - The action to apply.
 * @returns The next state value.
 */
export type Reducer<
  StateShape,
  ActionType extends UnknownAction = UnknownAction,
> = (state: Readonly<StateShape>, action: Readonly<ActionType>) => StateShape;

/**
 * A dispatch function sends an action to the store and returns it.
 *
 * @typeParam ActionType - The action type to dispatch.
 * @param action - The action to dispatch.
 * @returns The dispatched action.
 */
type DispatchFunction<ActionType extends UnknownAction = UnknownAction> = (
  action: Readonly<ActionType>
) => ActionType;

/**
 * A subscription callback invoked when the store state changes.
 */
type StoreListener = () => void;

/**
 * A minimal, Redux-like store interface with synchronous reducers.
 *
 * @typeParam StateShape - The state shape contained in the store.
 * @typeParam ActionType - The union of actions handled by the store.
 */
export interface AppStore<
  StateShape,
  ActionType extends UnknownAction = UnknownAction,
> {
  /** Returns the current state snapshot. */
  getState(): StateShape;
  /** Dispatches an action and returns it. */
  dispatch: DispatchFunction<ActionType>;
  /** Subscribes to state changes. Returns an unsubscribe function. */
  subscribe(listener: StoreListener): () => void;
}

/**
 * A reducer for a partition: a part of the state that another layer adds to a
 * store with {@link attachPartition}. It runs after the store's own reducer,
 * on every action, and gets the store's state after that reducer ran. So a
 * partition can react to the store's own actions in the same dispatch.
 *
 * Return the same state when nothing changed, or every dispatch notifies
 * subscribers. If it throws, the whole dispatch fails, as a throw in the
 * store's own reducer does.
 *
 * @typeParam PartState - The partition's state.
 * @typeParam StoreState - The store's own state.
 */
export type PartitionReducer<PartState, StoreState> = (
  state: Readonly<PartState>,
  action: Readonly<UnknownAction>,
  storeStateAfter: Readonly<StoreState>
) => PartState;

type PartitionAttacher = (
  key: string,
  reducer: PartitionReducer<unknown, unknown>,
  initialState: unknown
) => boolean;

/** How to attach a partition to each store {@link createAppStore} made. */
const partitionAttachers = new WeakMap<object, PartitionAttacher>();

/**
 * Creates a lightweight, synchronous store.
 *
 * - Calls the provided reducer synchronously on each dispatch, then the
 *   reducer of each attached partition
 * - Notifies subscribers only when the state reference changes
 *
 * @typeParam StateShape - The state shape contained in the store.
 * @typeParam ActionType - The union of actions handled by the reducer.
 * @param reducer - The reducer function.
 * @param preloadedState - The initial state.
 * @returns A new {@link AppStore} instance.
 */
export function createAppStore<
  StateShape,
  ActionType extends UnknownAction = UnknownAction,
>(
  reducer: Reducer<StateShape, ActionType>,
  preloadedState: StateShape
): AppStore<StateShape, ActionType> {
  let currentState: StateShape = preloadedState;
  const listeners: Set<StoreListener> = new Set();
  const partitions = new Map<string, PartitionReducer<unknown, StateShape>>();

  const getState = (): StateShape => currentState;

  const notify = () => {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Deliberately swallow to keep other listeners functioning
      }
    });
  };

  // Each partition reads its value from the state before the action, so the
  // store's own reducer can't drop or change it.
  const reduce = (
    state: StateShape,
    action: Readonly<ActionType>
  ): StateShape => {
    let next = reducer(state, action);
    partitions.forEach((partitionReducer, key) => {
      const part = partitionReducer(
        (state as Record<string, unknown>)[key],
        action,
        next
      );
      if (!Object.is(part, (next as Record<string, unknown>)[key])) {
        next = { ...next, [key]: part };
      }
    });
    return next;
  };

  const dispatch: DispatchFunction<ActionType> = (
    action: Readonly<ActionType>
  ): ActionType => {
    const previousState = currentState;
    if (isEnableDebugLog()) {
      debugLog(
        '[store] dispatch',
        (action as unknown as { type?: string }).type ?? action,
        action
      );
    }

    const nextState = reduce(previousState, action);
    if (nextState !== previousState) {
      if (isEnableDebugLog()) {
        // Compute a shallow set of changed top-level keys for quick visibility.
        const prevObj = previousState as unknown as Record<string, unknown>;
        const nextObj = nextState as unknown as Record<string, unknown>;
        const keys = new Set<string>([
          ...Object.keys(prevObj ?? {}),
          ...Object.keys(nextObj ?? {}),
        ]);
        const changed: string[] = [];
        for (const k of keys) {
          // Using Object.is to match store semantics for change detection.
          if (!Object.is(prevObj?.[k], nextObj?.[k])) {
            changed.push(k);
          }
        }
        debugLog('[store] state updated; changed keys', changed);
        debugLog('[store] notifying listeners', listeners.size);
      }
      currentState = nextState;
      commitMessageOwnership(store, currentState, action);
      notify();
    } else {
      commitMessageOwnership(store, currentState, action);
    }
    return action as ActionType;
  };

  const subscribe = (listener: StoreListener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const store = { getState, dispatch, subscribe };
  partitionAttachers.set(store, (key, partitionReducer, initialState) => {
    if (partitions.has(key)) {
      return false;
    }
    if (Object.prototype.hasOwnProperty.call(currentState, key)) {
      throw new Error(`The store already has a "${key}" value.`);
    }
    partitions.set(key, partitionReducer);
    currentState = { ...currentState, [key]: initialState };
    notify();
    return true;
  });
  return store;
}

/**
 * Adds a partition to a store made by {@link createAppStore}. The partition's
 * value lives under `key` in the store's state, and `reducer` updates it on
 * every dispatch. A dispatch that changes the store's own state and the
 * partition notifies subscribers once. Attaching notifies them too.
 *
 * Attaching a key the store already has a partition for does nothing, so a
 * partition lives as long as its store.
 *
 * @param store - A store from {@link createAppStore}.
 * @param key - Where the partition's value lives in the state.
 * @param reducer - Updates the partition's value.
 * @param initialState - The partition's first value.
 * @returns Whether this call added the partition.
 */
export function attachPartition<StoreState, PartState>(
  store: AppStore<StoreState>,
  key: string,
  reducer: PartitionReducer<PartState, StoreState>,
  initialState: PartState
): boolean {
  const attach = partitionAttachers.get(store);
  if (!attach) {
    throw new Error('Only a store from createAppStore takes partitions.');
  }
  return attach(
    key,
    reducer as PartitionReducer<unknown, unknown>,
    initialState
  );
}

/**
 * Performs a shallow equality check of two plain objects.
 * Returns true when both objects have the same keys and their values are `Object.is` equal.
 *
 * @typeParam TRecord - The record/object type to compare.
 * @param left - The left object.
 * @param right - The right object.
 * @returns Whether the two objects are shallowly equal.
 */
export function shallowEqual<T>(left: T, right: T): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (
    typeof left !== 'object' ||
    left === null ||
    typeof right !== 'object' ||
    right === null
  ) {
    return false;
  }
  const leftObj = left as unknown as Record<string, unknown>;
  const rightObj = right as unknown as Record<string, unknown>;
  const leftKeys = Object.keys(leftObj);
  const rightKeys = Object.keys(rightObj);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(rightObj, key)) {
      return false;
    }
    if (!Object.is(leftObj[key], rightObj[key])) {
      return false;
    }
  }
  return true;
}
