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
import { RenderCustomMessageFooter } from '../../../types/component/ChatContainer';

interface CustomFooterPortalsContainerProps {
  chatInstance: ChatInstance;
  /** Requests the React content for each message footer. */
  renderCustomMessageFooter?: RenderCustomMessageFooter;
  /** Detaches the slot host when a web-component callback returns no content. */
  removeEmptyHost?: boolean;
  /** Owns the records and the light-DOM host for each slot. */
  hosts: ExtensionHosts;
}

const selectRecords = (snapshot: ExtensionHostsSnapshot) =>
  snapshot.customFooter;

/**
 * Renders each custom message footer into the slot host the host service
 * keeps for it. A portal places the host's React content there, in the page's
 * light DOM.
 */
function CustomFooterPortalsContainer({
  chatInstance,
  renderCustomMessageFooter,
  removeEmptyHost,
  hosts,
}: CustomFooterPortalsContainerProps) {
  const records = useExtensionHosts(hosts, selectRecords);

  if (!renderCustomMessageFooter) {
    return null;
  }

  return (
    <>
      <RendererReport hosts={hosts} kind="customFooter" />
      {Object.entries(records).map(([slotName, slotState]) => {
        const { message, messageItem, additionalData } = slotState;
        return (
          <ExtensionSlotHost
            key={slotName}
            hosts={hosts}
            kind="customFooter"
            slot={slotName}
            content={renderCustomMessageFooter(
              slotName,
              message,
              messageItem,
              chatInstance,
              additionalData
            )}
            keepEmptyHost={!removeEmptyHost}
          />
        );
      })}
    </>
  );
}

const CustomFooterPortalsContainerExport = React.memo(
  CustomFooterPortalsContainer
);
export { CustomFooterPortalsContainerExport as CustomFooterPortalsContainer };
