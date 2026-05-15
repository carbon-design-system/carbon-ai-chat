/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Basic selector backed by `useSyncExternalStoreWithSelector` — the same
 * utility `react-redux` uses internally. This delegates selector identity,
 * equality-check, and snapshot-purity handling.
 *
 * For object/array outputs, pass `shallowEqual` or a custom comparator as
 * `equalityFn`.
 *
 * We import from the `shim/` subpath so that host apps on React 17 (which
 * does not expose `useSyncExternalStore`) get the backwards-compat polyfill
 * instead of an immediate `useSyncExternalStore is not a function` crash.
 * On React 18+ the shim detects native support and uses it.
 */

import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js";
import { useStore } from "./useStore";

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
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    selector,
    equalityFn,
  );
}
