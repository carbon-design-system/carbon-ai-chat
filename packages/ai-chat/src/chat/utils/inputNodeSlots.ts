/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { JSONContent } from '@tiptap/core';
import type { Message, MessageRequest } from '../../types/messaging/Messages';
import type { RenderUserDefinedInputNodeState } from '../../types/component/ChatContainer';

/**
 * The TipTap node types that the rich user message bubble walker
 * (`MessageRichUserContent`) renders as text. Every other node — `mention`,
 * `command`, and custom nodes — gets a slot and is routed through
 * `renderUserDefinedInputNode`.
 */
const BUILT_IN_NODE_TYPES = new Set(['doc', 'paragraph', 'text', 'hardBreak']);

/** One input node a sent message renders through the host's callback. */
interface InputNodeSlotEntry {
  slotKey: string;
  state: RenderUserDefinedInputNodeState;
  isInline: boolean;
}

// One message's entries, kept while the store holds that message object. A
// renderer gets the same `state` object for a slot on every render, which is
// what the web-component adapter keys its per-slot cache on.
const entriesByMessage = new WeakMap<MessageRequest, InputNodeSlotEntry[]>();

export function collectSlotEntries(
  allMessagesByID: Record<string, Message>
): InputNodeSlotEntry[] {
  const entries: InputNodeSlotEntry[] = [];
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

export type { InputNodeSlotEntry };
