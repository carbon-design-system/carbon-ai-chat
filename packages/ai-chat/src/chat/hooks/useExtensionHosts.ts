/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

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

export { useExtensionHosts };
