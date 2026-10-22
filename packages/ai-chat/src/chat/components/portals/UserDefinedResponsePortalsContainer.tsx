/*
 *  Copyright IBM Corp. 2025, 2026
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
import { RenderUserDefinedResponse } from '../../../types/component/ChatContainer';

interface UserDefinedResponsePortalsContainerProps {
  chatInstance: ChatInstance;
  /** Requests the React content for each user-defined response. */
  renderUserDefinedResponse?: RenderUserDefinedResponse;
  /** Detaches the slot host when a web-component callback returns no content. */
  removeEmptyHost?: boolean;
  /** Owns the records and the light-DOM host for each slot. */
  hosts: ExtensionHosts;
}

const selectRecords = (snapshot: ExtensionHostsSnapshot) =>
  snapshot.userDefinedResponse;

/**
 * Renders each user-defined response into the slot host the host service
 * keeps for it. When a user_defined item arrives, the chat fires an event with
 * a slot, and the service records it. A portal places the host's React
 * content there, in the page's light DOM.
 */
function UserDefinedResponsePortalsContainer({
  chatInstance,
  renderUserDefinedResponse,
  removeEmptyHost,
  hosts,
}: UserDefinedResponsePortalsContainerProps) {
  const records = useExtensionHosts(hosts, selectRecords);

  if (!renderUserDefinedResponse) {
    return null;
  }

  return (
    <>
      <RendererReport hosts={hosts} kind="userDefinedResponse" />
      {Object.entries(records).map(([slot, slotState]) => (
        <ExtensionSlotHost
          key={slot}
          hosts={hosts}
          kind="userDefinedResponse"
          slot={slot}
          content={renderUserDefinedResponse(slotState, chatInstance)}
          keepEmptyHost={!removeEmptyHost}
        />
      ))}
    </>
  );
}

const UserDefinedResponsePortalsContainerExport = React.memo(
  UserDefinedResponsePortalsContainer
);
export { UserDefinedResponsePortalsContainerExport as UserDefinedResponsePortalsContainer };
