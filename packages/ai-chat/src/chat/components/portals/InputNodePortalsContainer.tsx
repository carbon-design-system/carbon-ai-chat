/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";

import { useSelector } from "../../hooks/useSelector";
import type { AppState } from "../../../types/state/AppState";
import type { ChatInstance } from "../../../types/instance/ChatInstance";
import type {
  Message,
  MessageRequest,
} from "../../../types/messaging/Messages";
import type { RenderUserDefinedInputNode } from "../../../types/component/ChatContainer";
import type { JSONContent } from "@tiptap/core";

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
  "doc",
  "paragraph",
  "text",
  "hardBreak",
  "mention",
  "command",
]);

interface SlotEntry {
  slotKey: string;
  messageId: string;
  node: JSONContent;
  message: MessageRequest;
}

/**
 * Mirrors `UserDefinedResponsePortalsContainer` for the new bubble custom
 * node API. For every non-built-in TipTap node inside a user message's
 * `display_content`, we:
 *
 *   1. Append a `<div slot=cds-aichat-input-node-X>` to the chat wrapper's
 *      light DOM (so consumer stylesheets reach the content).
 *   2. `ReactDOM.createPortal` the consumer's `renderUserDefinedInputNode`
 *      output into that div.
 *
 * `MessageRichUserContent` emits a matching `<slot name=...>` in the message
 * bubble that projects the slotted div back into the visual position. When the
 * consumer returns `null`, no slotted content is added and the slot's fallback
 * children (the node's label / value) show through.
 */
function InputNodePortalsContainer({
  chatInstance,
  renderUserDefinedInputNode,
  chatWrapper,
}: InputNodePortalsContainerProps) {
  const allMessagesByID = useSelector(
    (state: AppState) => state.allMessagesByID,
  );

  const slotEntries = useMemo(
    () => collectSlotEntries(allMessagesByID),
    [allMessagesByID],
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
        const node = renderUserDefinedInputNode(
          { node: entry.node, message: entry.message },
          chatInstance,
        );
        if (node == null) {
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
          host = document.createElement("div");
          host.setAttribute("slot", entry.slotKey);
          hostElementsRef.current.set(entry.slotKey, host);
          chatWrapper.appendChild(host);
        }

        return (
          <InputNodePortal key={entry.slotKey} host={host}>
            {node}
          </InputNodePortal>
        );
      })}
    </>
  );
}

function InputNodePortal({
  host,
  children,
}: {
  host: HTMLElement;
  children: React.ReactNode;
}) {
  return ReactDOM.createPortal(children, host);
}

function collectSlotEntries(
  allMessagesByID: Record<string, Message>,
): SlotEntry[] {
  const entries: SlotEntry[] = [];
  for (const message of Object.values(allMessagesByID)) {
    if (!isRequestWithDisplayContent(message)) {
      continue;
    }
    const messageId = message.id ?? "";
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
  message: Message,
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
  messageId: string,
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
    const type = node.type ?? "";

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
    args.messageId,
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
