/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';

import { ExtensionSlotHost, RendererReport } from './SlotHostPortal';
import { useExtensionHosts } from '../../hooks/useExtensionHosts';
import type {
  ExtensionHosts,
  ExtensionHostsSnapshot,
} from '../../services/extensionHosts';
import { ChatInstance } from '../../../types/instance/ChatInstance';
import { RenderCustomRequestFooter } from '../../../types/component/ChatContainer';

interface CustomRequestFooterPortalsContainerProps {
  chatInstance: ChatInstance;
  /** Requests the React content to display below each user message. */
  renderCustomRequestFooter?: RenderCustomRequestFooter;
  /** Owns the records and the light-DOM host for each slot. */
  hosts: ExtensionHosts;
}

const selectRecords = (snapshot: ExtensionHostsSnapshot) =>
  snapshot.customRequestFooter;

/**
 * Renders each footer below a user message into the slot host the host
 * service keeps for it. A portal places the host's React content there, in the
 * page's light DOM.
 *
 * An empty result attaches no host. An empty host still picks up the slotted
 * margin, so a callback that returns null would leave a gap under the bubble.
 */
function CustomRequestFooterPortalsContainer({
  chatInstance,
  renderCustomRequestFooter,
  hosts,
}: CustomRequestFooterPortalsContainerProps) {
  const records = useExtensionHosts(hosts, selectRecords);

  if (!renderCustomRequestFooter) {
    return null;
  }

  return (
    <>
      <RendererReport hosts={hosts} kind="customRequestFooter" />
      {Object.entries(records).map(([slotName, slotState]) => (
        <ExtensionSlotHost
          key={slotName}
          hosts={hosts}
          kind="customRequestFooter"
          slot={slotName}
          content={renderCustomRequestFooter(
            slotName,
            slotState.message,
            chatInstance
          )}
          keepEmptyHost={false}
        />
      ))}
    </>
  );
}

const CustomRequestFooterPortalsContainerExport = React.memo(
  CustomRequestFooterPortalsContainer
);
export { CustomRequestFooterPortalsContainerExport as CustomRequestFooterPortalsContainer };
