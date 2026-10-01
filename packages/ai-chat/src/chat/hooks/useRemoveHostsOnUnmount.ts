/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MutableRefObject, useEffect } from 'react';

/**
 * Detaches a portal container's light-DOM host elements when it unmounts. The
 * hosts live outside React's tree, so without this a removed render prop would
 * leave its hosts slotted into the chat, adding it back would duplicate them,
 * and a remounted chat would find the previous mount's content still slotted
 * into the same outer element.
 *
 * Hosts are created during render, so the map is kept and reattached on mount:
 * StrictMode replays effects without rendering again.
 */
function useRemoveHostsOnUnmount(
  hostsRef: MutableRefObject<Map<string, HTMLElement>>,
  chatWrapper: HTMLElement | undefined
) {
  useEffect(() => {
    const hosts = hostsRef.current;
    hosts.forEach((host) => {
      if (!host.isConnected) {
        chatWrapper?.appendChild(host);
      }
    });
    return () => hosts.forEach((host) => host.remove());
  }, [hostsRef, chatWrapper]);
}

export { useRemoveHostsOnUnmount };
