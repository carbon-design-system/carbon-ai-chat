/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Basic selector using `useSyncExternalStore`.
 * Pure snapshot returns previous ref when values are equal. Caches last value...comparator defaults to `Object.is`.
 *
 * For object/array outputs, pass `shallowEqual` or a custom comparator.
 */

import React, { useCallback, useRef } from "react";
import { useSyncExternalStore as useSyncExternalStoreShim } from "use-sync-external-store/shim";
import { useStore } from "./useStore";

/** Choose the right `useSyncExternalStore` (React 17 uses the shim). */
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
