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
import prefix from '@carbon/ai-chat-components/es/globals/settings.js';
import { mountHost, mountInlineHost, unmountHost } from './inputNodeHosts';
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
  isInline: boolean;
}

// One message's entries, kept while the store holds that message object. A
// renderer gets the same `state` object for a slot on every render, which is
// what the web-component adapter keys its per-slot cache on.
const entriesByMessage = new WeakMap<MessageRequest, SlotEntry[]>();

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
  entry: { slotKey, state, isInline },
  chatWrapper,
  chatInstance,
  renderUserDefinedInputNode,
}: Required<InputNodePortalsContainerProps> & { entry: SlotEntry }) {
  // Native clipboard serializers preserve paragraph flow for span hosts.
  // A div host can insert a newline even when page CSS makes it inline.
  const isTokenNode =
    state.node.type === 'mention' || state.node.type === 'command';
  const host = useMemo(
    () => document.createElement(isInline || isTokenNode ? 'span' : 'div'),
    [isInline, isTokenNode]
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
    if (isInline) {
      host.className = `${prefix}-markdown-inline-plugin`;
      return mountInlineHost(chatWrapper, slotKey, host);
    }
    host.setAttribute('slot', slotKey);
    mountHost(chatWrapper, host, slotKey, isInline || isTokenNode);
    return () => {
      unmountHost(chatWrapper, host, slotKey);
    };
  }, [chatWrapper, host, slotKey, hasContent, isInline, isTokenNode]);

  return hasContent ? (
    <SlotHostPortal hostElement={host}>{content}</SlotHostPortal>
  ) : null;
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
      ).map(({ slotKey, node, isInline }) => ({
        slotKey,
        state: { node, message },
        isInline,
      }));
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
  isInline: boolean;
}

// The message walker uses these same keys for inline targets and block slots.
export function collectInputNodeSlots(
  content: JSONContent,
  messageId: string
): InputNodeSlot[] {
  const out: InputNodeSlot[] = [];
  const stack: Array<{ node: JSONContent; path: string; isInline: boolean }> =
    [];
  const top = content.content ?? [];
  for (let i = top.length - 1; i >= 0; i--) {
    stack.push({ node: top[i], path: `${i}`, isInline: false });
  }

  while (stack.length) {
    const frame = stack.pop();
    if (!frame) {
      break;
    }
    const { node, path, isInline } = frame;
    const type = node.type ?? '';

    if (!BUILT_IN_NODE_TYPES.has(type)) {
      out.push({ slotKey: `${messageId}::${path}`, node, isInline });
      // Don't descend further — the consumer owns the rendering.
      continue;
    }

    if (node.content && node.content.length) {
      for (let i = node.content.length - 1; i >= 0; i--) {
        stack.push({
          node: node.content[i],
          path: `${path}.${i}`,
          isInline: type === 'paragraph',
        });
      }
    }
  }

  return out;
}

const InputNodePortalsContainerExport = React.memo(InputNodePortalsContainer);
export { InputNodePortalsContainerExport as InputNodePortalsContainer };
