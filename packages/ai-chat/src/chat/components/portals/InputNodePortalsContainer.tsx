/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useLayoutEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

import { useSelector } from '../../hooks/useSelector';
import type { AppState } from '../../../types/state/AppState';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import type {
  Message,
  MessageRequest,
} from '../../../types/messaging/Messages';
import type { RenderUserDefinedInputNode } from '../../../types/component/ChatContainer';
import type { JSONContent } from '@tiptap/core';

interface InputNodePortalsContainerProps {
  chatInstance: ChatInstance;
  renderUserDefinedInputNode: RenderUserDefinedInputNode;
  chatWrapper?: HTMLElement;
}

/**
 * The set of TipTap node types that the rich user message bubble walker
 * (`MessageRichUserContent`) renders natively. Anything else is treated as
 * a custom node and routed through `renderUserDefinedInputNode`.
 */
const BUILT_IN_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'text',
  'hardBreak',
  'mention',
  'command',
]);

interface SlotEntry {
  slotKey: string;
  messageId: string;
  node: JSONContent;
  message: MessageRequest;
}

/**
 * Portals `renderUserDefinedInputNode` output for every custom node in a
 * user message's `display_content`. `MessageRichUserContent` emits a matching
 * `<slot name={slotKey}>` whose fallback is the node's label, which shows when
 * the renderer returns `null`.
 *
 * Each host is offered through the markdown plugin-host protocol, so the
 * outermost chat element hosts it in page light DOM and forwards the slot
 * inward. Without a claimant the host stays on the chat wrapper.
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
  entry: { node, message, slotKey },
  chatWrapper,
  chatInstance,
  renderUserDefinedInputNode,
}: InputNodePortalsContainerProps & { entry: SlotEntry }) {
  const host = useMemo(() => document.createElement('div'), []);
  const content = useMemo(
    () => renderUserDefinedInputNode({ node, message }, chatInstance),
    [node, message, chatInstance, renderUserDefinedInputNode]
  );
  const hasContent = content != null;

  useLayoutEffect(() => {
    if (!hasContent) {
      return undefined;
    }
    host.setAttribute('slot', slotKey);
    const mount = new CustomEvent('cds-aichat-markdown-plugin-host-mount', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: {
        kind: 'customRenderer',
        slotName: slotKey,
        element: host,
        isInline: false,
      },
    });
    chatWrapper.dispatchEvent(mount);
    if (!mount.defaultPrevented) {
      chatWrapper.appendChild(host);
    }
    return () => {
      // The host has moved; dispatch from the wrapper to reach every forwarder.
      chatWrapper.dispatchEvent(
        new CustomEvent('cds-aichat-markdown-plugin-host-unmount', {
          bubbles: true,
          composed: true,
          detail: { slotName: slotKey },
        })
      );
      host.remove();
    };
  }, [chatWrapper, host, slotKey, hasContent]);

  return hasContent ? ReactDOM.createPortal(content, host) : null;
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
    const displayContent = (message as MessageRequest).input.display_content;
    if (!displayContent) {
      continue;
    }
    walkForSlots({
      content: displayContent,
      messageId,
      message: message as MessageRequest,
      out: entries,
    });
  }
  return entries;
}

function isRequestWithDisplayContent(
  message: Message
): message is MessageRequest {
  return Boolean((message as MessageRequest)?.input?.display_content);
}

interface WalkArgs {
  content: JSONContent;
  messageId: string;
  message: MessageRequest;
  out: SlotEntry[];
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

function walkForSlots(args: WalkArgs): void {
  for (const { slotKey, node } of collectInputNodeSlots(
    args.content,
    args.messageId
  )) {
    args.out.push({
      slotKey,
      messageId: args.messageId,
      node,
      message: args.message,
    });
  }
}

const InputNodePortalsContainerExport = React.memo(InputNodePortalsContainer);
export { InputNodePortalsContainerExport as InputNodePortalsContainer };
