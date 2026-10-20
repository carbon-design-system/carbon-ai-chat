/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useMemo } from 'react';

import {
  ContentReport,
  RendererReport,
  SlotHostPortal,
} from './SlotHostPortal';
import {
  useExtensionHosts,
  useInputNodePlaced,
} from '../../hooks/useExtensionHosts';
import type {
  ExtensionHosts,
  ExtensionHostsSnapshot,
} from '../../services/extensionHosts';
import type { InputNodeSlotEntry } from '../../utils/inputNodeSlots';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import type { RenderUserDefinedInputNode } from '../../../types/component/ChatContainer';

interface InputNodePortalsContainerProps {
  chatInstance: ChatInstance;
  renderUserDefinedInputNode: RenderUserDefinedInputNode;
  /** Owns the input-node entries and the light-DOM host for each one. */
  hosts: ExtensionHosts;
}

const selectEntries = (snapshot: ExtensionHostsSnapshot) => snapshot.inputNode;

/**
 * Renders each non-built-in node in a sent message's `display_content` into
 * the host the host service keeps for it.
 */
function InputNodePortalsContainer({
  chatInstance,
  renderUserDefinedInputNode,
  hosts,
}: InputNodePortalsContainerProps) {
  const entries = useExtensionHosts(hosts, selectEntries);

  return (
    <>
      <RendererReport hosts={hosts} kind="inputNode" />
      {entries.map((entry) => (
        <InputNodePortal
          key={entry.slotKey}
          entry={entry}
          hosts={hosts}
          chatInstance={chatInstance}
          renderUserDefinedInputNode={renderUserDefinedInputNode}
        />
      ))}
    </>
  );
}

function InputNodePortal({
  entry,
  hosts,
  chatInstance,
  renderUserDefinedInputNode,
}: InputNodePortalsContainerProps & { entry: InputNodeSlotEntry }) {
  const host = hosts.inputNodeHostFor(entry);
  const { slotKey, state } = entry;
  const placed = useInputNodePlaced(hosts, slotKey);
  // `state` is stable per slot until its message changes, so the renderer is
  // not called again on every message-store update.
  const content = useMemo(
    () => renderUserDefinedInputNode(state, chatInstance),
    [state, chatInstance, renderUserDefinedInputNode]
  );
  // A dropped node leaves no host, so the slot falls back to its inline label.
  const hasContent = !(
    content == null ||
    typeof content === 'boolean' ||
    content === ''
  );

  // An inline host waits for its bubble target. The bubble puts that target's
  // paragraph on the page later in the same commit, before this re-renders,
  // so the content mounts connected. That holds only while the paragraph
  // mounts synchronously.
  return hasContent ? (
    <>
      <ContentReport
        hosts={hosts}
        kind="inputNode"
        slot={slotKey}
        host={host}
      />
      {placed && <SlotHostPortal hostElement={host}>{content}</SlotHostPortal>}
    </>
  ) : null;
}

const InputNodePortalsContainerExport = React.memo(InputNodePortalsContainer);
export { InputNodePortalsContainerExport as InputNodePortalsContainer };
