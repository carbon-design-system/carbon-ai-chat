/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * useSelector
 *
 * Typed, minimal `react-redux`‑style selector built on React's `useSyncExternalStore`.
 * - Contract: `getSnapshot` must be pure and return the same reference when the
 *   selected value is equal.
 * - Caching: we store the last selected value and reuse its reference when
 *   `equalityFn` (default `Object.is`) reports equality.
 * - Equality: pass `shallowEqual` (or custom) for object/array selections that
 *   recreate on each call; otherwise rely on stable references or primitives.
 */

import React, { useCallback, useRef } from "react";
import { useSyncExternalStore as useSyncExternalStoreShim } from "use-sync-external-store/shim";
import { useStore } from "./useStore";

/** Resolve the correct `useSyncExternalStore` for the current React version. React 17 needs a pollyfill. */
const useSyncExternalStore: typeof React.useSyncExternalStore =
  (
    React as unknown as {
      useSyncExternalStore?: typeof React.useSyncExternalStore;
    }
  ).useSyncExternalStore ?? useSyncExternalStoreShim;

/**
 * Select a slice and subscribe to changes.
 * - `selector`: maps root state to the value you need
 * - `equalityFn`: optional comparator (default `Object.is`)
 */
export function useSelector<RootState, Selected>(
  selector: (state: RootState) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean,
): Selected {
  const store = useStore<RootState>();

  // Cache the last selected value to ensure `getSnapshot` returns a stable
  // reference when the selected slice is equal, preventing infinite loops.
  const lastSelectedRef = useRef<Selected | symbol>(UNINITIALIZED);
  const compare = equalityFn ?? Object.is;

  // Pure snapshot returns previous ref when values compare equal.
  const computeSelected = useCallback((): Selected => {
    const nextSelected = selector(store.getState());
    const lastSelected = lastSelectedRef.current;
    if (
      lastSelected !== UNINITIALIZED &&
      compare(nextSelected as Selected, lastSelected as Selected)
    ) {
      return lastSelected as Selected;
    }
    lastSelectedRef.current = nextSelected as Selected;
    return nextSelected;
  }, [store, selector, compare]);

  return useSyncExternalStore(
    store.subscribe,
    computeSelected,
    computeSelected,
  );
}

// Sentinel to distinguish “no cached value yet” from valid falsy values.
const UNINITIALIZED = Symbol("useSelector.uninitialized");
