/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useLayoutEffect, useMemo } from 'react';

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
 *   1. Create a host element and offer it through the markdown plugin-host
 *      protocol, so the outermost chat element hosts it in page light DOM
 *      (where consumer stylesheets reach the content) and forwards the slot
 *      inward. Without a claimant the host stays on the chat wrapper. The tag
 *      is `<span>` for `mention` and `command` nodes so they render inline
 *      alongside surrounding text; `<div>` for all other custom nodes that may
 *      contain block-level content.
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

  if (!chatWrapper) {
    return null;
  }

  return (
    <>
      {slotEntries.map((entry) => (
        <InputNodePortal
          key={entry.slotKey}
          entry={entry}
          chatWrapper={chatWrapper}
          chatInstance={chatInstance}
          renderUserDefinedInputNode={renderUserDefinedInputNode}
        />
      ))}
    </>
  );
}

function InputNodePortal({
  entry: { slotKey, state },
  chatWrapper,
  chatInstance,
  renderUserDefinedInputNode,
}: Required<InputNodePortalsContainerProps> & { entry: SlotEntry }) {
  // Use an inline element for token nodes so the custom chip sits in the text
  // flow. Block custom nodes (e.g. tileChip) keep a <div> so their block-level
  // content is valid HTML.
  const isTokenNode =
    state.node.type === 'mention' || state.node.type === 'command';
  const host = useMemo(
    () => document.createElement(isTokenNode ? 'span' : 'div'),
    [isTokenNode]
  );
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

  useLayoutEffect(() => {
    if (!hasContent) {
      return undefined;
    }
    host.setAttribute('slot', slotKey);
    mountHost(chatWrapper, host, slotKey, isTokenNode);
    return () => unmountHost(chatWrapper, host, slotKey);
  }, [chatWrapper, host, slotKey, hasContent, isTokenNode]);

  return hasContent ? (
    <SlotHostPortal hostElement={host}>{content}</SlotHostPortal>
  ) : null;
}

/**
 * Offers a host through the markdown plugin-host protocol. When no ancestor
 * claims it, the host stays on the chat wrapper.
 */
function mountHost(
  chatWrapper: HTMLElement,
  host: HTMLElement,
  slotName: string,
  isInline: boolean
) {
  const mount = new CustomEvent('cds-aichat-markdown-plugin-host-mount', {
    bubbles: true,
    composed: true,
    cancelable: true,
    detail: { kind: 'customRenderer', slotName, element: host, isInline },
  });
  chatWrapper.dispatchEvent(mount);
  if (!mount.defaultPrevented) {
    chatWrapper.appendChild(host);
  }
}

/**
 * Removes a host. A claimant may have moved it, so the event goes out from the
 * wrapper to reach every forwarder.
 */
function unmountHost(
  chatWrapper: HTMLElement,
  host: HTMLElement,
  slotName: string
) {
  chatWrapper.dispatchEvent(
    new CustomEvent('cds-aichat-markdown-plugin-host-unmount', {
      bubbles: true,
      composed: true,
      detail: { slotName },
    })
  );
  host.remove();
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
