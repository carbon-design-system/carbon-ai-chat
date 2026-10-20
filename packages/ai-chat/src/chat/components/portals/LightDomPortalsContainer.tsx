/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { useExtensionHosts } from '../../hooks/useExtensionHosts';
import type {
  ExtensionHosts,
  ExtensionHostsSnapshot,
} from '../../services/extensionHosts';

interface LightDomPortalsContainerProps {
  /** Owns the slots, hosts, listener, and observer behind each entry. */
  hosts: ExtensionHosts;
}

const selectEntries = (snapshot: ExtensionHostsSnapshot) => snapshot.lightDom;

/**
 * Renders the React content that editor tokens and node views place in the
 * page's light DOM through `renderInLightDom`. The host service creates each
 * slot and host; this places the caller's React node in its host.
 */
function LightDomPortalsContainer({ hosts }: LightDomPortalsContainerProps) {
  const entries = useExtensionHosts(hosts, selectEntries);
  return (
    <>
      {entries
        .filter((entry) => entry.reactNode != null)
        .map((entry) =>
          ReactDOM.createPortal(entry.reactNode, entry.hostElement, entry.key)
        )}
    </>
  );
}

const LightDomPortalsContainerExport = React.memo(LightDomPortalsContainer);
export { LightDomPortalsContainerExport as LightDomPortalsContainer };
