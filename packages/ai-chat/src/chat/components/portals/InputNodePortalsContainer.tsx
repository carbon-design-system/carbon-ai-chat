/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useMemo, useRef } from 'react';

import { useSelector } from '../../hooks/useSelector';
import { SlotHostPortal } from './SlotHostPortal';
import type { AppState } from '../../../types/state/AppState';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import type {
  Message,
  MessageRequest,
} from '../../../types/messaging/Messages';
import type {
  RenderUserDefinedInputNode,
  RenderUserDefinedInputNodeState,
} from '../../../types/component/ChatContainer';
import type { JSONContent } from '@tiptap/core';

interface InputNodePortalsContainerProps {
  chatInstance: ChatInstance;
  renderUserDefinedInputNode: RenderUserDefinedInputNode;
  chatWrapper?: HTMLElement;
}

/**
 * The TipTap node types that the rich user message bubble walker
 * (`MessageRichUserContent`) renders as text. Every other node — `mention`,
 * `command`, and custom nodes — gets a slot and is routed through
 * `renderUserDefinedInputNode`.
 */
const BUILT_IN_NODE_TYPES = new Set(['doc', 'paragraph', 'text', 'hardBreak']);

interface SlotEntry {
  slotKey: string;
  state: RenderUserDefinedInputNodeState;
}

// One message's entries, kept while the store holds that message object. A
// renderer gets the same `state` object for a slot on every render, which is
// what the web-component adapter keys its per-slot cache on.
const entriesByMessage = new WeakMap<MessageRequest, SlotEntry[]>();

/**
 * Mirrors `UserDefinedResponsePortalsContainer` for the new bubble custom
 * node API. For every non-built-in TipTap node inside a user message's
 * `display_content`, we:
 *
 *   1. Append a host element to the chat wrapper's light DOM (so consumer
 *      stylesheets reach the content). The tag is `<span>` for `mention` and
 *      `command` nodes so they render inline alongside surrounding text;
 *      `<div>` for all other custom nodes that may contain block-level content.
 *   2. Mount the consumer's `renderUserDefinedInputNode` output in that host
 *      element through `SlotHostPortal`.
 *
 * `MessageRichUserContent` emits a matching `<slot name=...>` in the message
 * bubble that projects the slotted host back into the visual position. When the
 * consumer returns `null`, no slotted content is added and the slot's fallback
 * children (the node's label / value) show through.
 */
function InputNodePortalsContainer({
  chatInstance,
  renderUserDefinedInputNode,
  chatWrapper,
}: InputNodePortalsContainerProps) {
  const allMessagesByID = useSelector(
    (state: AppState) => state.allMessagesByID
  );

  const slotEntries = useMemo(
    () => collectSlotEntries(allMessagesByID),
    [allMessagesByID]
  );

  // Map slotKey -> light-DOM host element. Hosts persist across renders so
  // React doesn't re-mount the consumer's content when message order
  // shifts.
  const hostElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Reap hosts whose slot is no longer present in any message.
  useEffect(() => {
    const liveKeys = new Set(slotEntries.map((entry) => entry.slotKey));
    for (const [key, host] of hostElementsRef.current.entries()) {
      if (!liveKeys.has(key)) {
        if (host.parentNode) {
          host.parentNode.removeChild(host);
        }
        hostElementsRef.current.delete(key);
      }
    }
  }, [slotEntries]);

  // Clean up everything on unmount.
  useEffect(() => {
    const hosts = hostElementsRef.current;
    return () => {
      for (const host of hosts.values()) {
        if (host.parentNode) {
          host.parentNode.removeChild(host);
        }
      }
      hosts.clear();
    };
  }, []);

  if (!chatWrapper) {
    return null;
  }

  return (
    <>
      {slotEntries.map((entry) => {
        const node = renderUserDefinedInputNode(entry.state, chatInstance);
        if (node == null || typeof node === 'boolean' || node === '') {
          // Drop any previously mounted host for this slot — the consumer
          // dropped this node, so the slot falls back to its inline label.
          const existing = hostElementsRef.current.get(entry.slotKey);
          if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
            hostElementsRef.current.delete(entry.slotKey);
          }
          return null;
        }

        let host = hostElementsRef.current.get(entry.slotKey);
        if (!host) {
          // Use an inline element for token nodes so the custom chip sits in
          // the text flow. Block custom nodes (e.g. tileChip) keep a <div>
          // so their block-level content is valid HTML.
          const isTokenNode =
            entry.state.node.type === 'mention' ||
            entry.state.node.type === 'command';
          host = document.createElement(isTokenNode ? 'span' : 'div');
          host.setAttribute('slot', entry.slotKey);
          hostElementsRef.current.set(entry.slotKey, host);
          chatWrapper.appendChild(host);
        }

        return (
          <SlotHostPortal key={entry.slotKey} hostElement={host}>
            {node}
          </SlotHostPortal>
        );
      })}
    </>
  );
}

function collectSlotEntries(
  allMessagesByID: Record<string, Message>
): SlotEntry[] {
  const entries: SlotEntry[] = [];
  for (const message of Object.values(allMessagesByID)) {
    if (!isRequestWithDisplayContent(message)) {
      continue;
    }
    const messageId = message.id ?? '';
    if (!messageId) {
      continue;
    }
    let messageEntries = entriesByMessage.get(message);
    if (!messageEntries) {
      messageEntries = collectInputNodeSlots(
        message.input.display_content,
        messageId
      ).map(({ slotKey, node }) => ({ slotKey, state: { node, message } }));
      entriesByMessage.set(message, messageEntries);
    }
    entries.push(...messageEntries);
  }
  return entries;
}

function isRequestWithDisplayContent(
  message: Message
): message is MessageRequest {
  return Boolean((message as MessageRequest)?.input?.display_content);
}

/** A non-built-in node found in a `display_content` doc, with its slot key. */
export interface InputNodeSlot {
  slotKey: string;
  node: JSONContent;
}

/**
 * Collect the slot key for every non-built-in TipTap node in a
 * `display_content` doc, in document order. The slot key
 * (`${messageId}::${path}`, where `path` is the dot-joined child-index trail)
 * MUST match the `<slot name>` that `MessageRichUserContent` emits at the same
 * structural position — that is the contract that lets the portal host project
 * back into the bubble. Exported so the slot-key contract test can pin it
 * against `MessageRichUserContent`'s rendering walk.
 */
export function collectInputNodeSlots(
  content: JSONContent,
  messageId: string
): InputNodeSlot[] {
  const out: InputNodeSlot[] = [];
  const stack: Array<{ node: JSONContent; path: string }> = [];
  const top = content.content ?? [];
  for (let i = top.length - 1; i >= 0; i--) {
    stack.push({ node: top[i], path: `${i}` });
  }

  while (stack.length) {
    const frame = stack.pop();
    if (!frame) {
      break;
    }
    const { node, path } = frame;
    const type = node.type ?? '';

    if (!BUILT_IN_NODE_TYPES.has(type)) {
      out.push({ slotKey: `${messageId}::${path}`, node });
      // Don't descend further — the consumer owns the rendering.
      continue;
    }

    if (node.content && node.content.length) {
      for (let i = node.content.length - 1; i >= 0; i--) {
        stack.push({ node: node.content[i], path: `${path}.${i}` });
      }
    }
  }

  return out;
}

const InputNodePortalsContainerExport = React.memo(InputNodePortalsContainer);
export { InputNodePortalsContainerExport as InputNodePortalsContainer };
