/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback, useLayoutEffect, useReducer } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim/index.js';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector.js';
import type {
  ExtensionHosts,
  ExtensionHostsSnapshot,
} from '../services/extensionHosts';

/** Selects from the host service and re-renders only when the value changes. */
function useExtensionHosts<Selected>(
  hosts: ExtensionHosts,
  selector: (snapshot: ExtensionHostsSnapshot) => Selected
): Selected {
  return useSyncExternalStoreWithSelector(
    hosts.subscribe,
    hosts.getSnapshot,
    hosts.getSnapshot,
    selector
  );
}

/** Re-renders when an input node's host is first placed in its target. */
function useInputNodePlaced(hosts: ExtensionHosts, slotKey: string): boolean {
  const getPlaced = useCallback(
    () => hosts.isInputNodePlaced(slotKey),
    [hosts, slotKey]
  );
  const placed = useSyncExternalStore(hosts.subscribe, getPlaced, getPlaced);
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  // A target that already exists places the host in a child's layout effect,
  // before the store subscription above. Re-render now, before paint, so the
  // fallback never hides ahead of the content.
  useLayoutEffect(() => {
    if (!placed && getPlaced()) {
      rerender();
    }
  });
  return placed;
}

export { useExtensionHosts, useInputNodePlaced };
