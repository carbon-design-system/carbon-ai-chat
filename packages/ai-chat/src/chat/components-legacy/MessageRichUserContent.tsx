/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Render the TipTap JSONContent captured at send time into a user message
 * bubble. Two paths:
 *
 *   Pure text: every node in the doc is `paragraph` / `text` / `hardBreak`.
 *   Flatten to a string and hand off to `<MarkdownWithDefaults>` so
 *   cross-paragraph markdown (fenced code blocks, lists, tables) keeps
 *   working — visually identical to the legacy plain-text bubble.
 *
 *   Structured: at least one paragraph contains a mention, command, or
 *   unknown custom node. Walk paragraph-by-paragraph and use
 *   `renderInlineMarkdown` for runs of plain text. Chip nodes mount the
 *   shared `renderTokenChip` element via a ref. Unknown node types emit a
 *   `<slot name={slotKey}>`; `InputNodePortalsContainer` walks the same
 *   `display_content`, derives the identical slot key, and projects the
 *   consumer's `renderUserDefinedInputNode` output into it. The slot-key
 *   scheme is shared via `collectInputNodeSlots` and pinned by
 *   `messageRichUserContentSlots_spec`.
 */

import React, { useEffect, useMemo, useRef } from "react";

import { MarkdownWithDefaults } from "../components/util/MarkdownWithDefaults";
import { renderInlineMarkdown } from "../components/util/inline-markdown";
import { renderTokenChip } from "@carbon/ai-chat-components/es/components/input/index.js";
import type { JSONContent } from "@tiptap/core";
import type { MessageRequest } from "../../types/messaging/Messages";

/**
 * Data attribute mirroring the `<slot>` name for an unknown TipTap node type.
 * `InputNodePortalsContainer` matches the slot by its `name`; this attribute
 * exists so the slot is also queryable (e.g. by the slot-key contract test).
 */
export const INPUT_NODE_SLOT_ATTR = "data-aichat-input-node-slot";
export const INPUT_NODE_TYPE_ATTR = "data-aichat-input-node-type";

interface MessageRichUserContentProps {
  content: JSONContent;
  message: MessageRequest;
}

const TEXTUAL_NODE_TYPES = new Set(["doc", "paragraph", "text", "hardBreak"]);

export function MessageRichUserContent({
  content,
  message,
}: MessageRichUserContentProps) {
  const messageId = message.id ?? "unknown";
  const topLevelChildren = content.content ?? [];

  const allTextual = useMemo(() => isPureTextualDoc(content), [content]);

  if (allTextual) {
    const flat = flattenTextualDoc(content);
    return (
      <MarkdownWithDefaults text={flat} removeHTML overrideSanitize={true} />
    );
  }

  return (
    <>
      {topLevelChildren.map((blockNode, blockIndex) => {
        if (blockNode.type !== "paragraph") {
          return (
            <UnknownNodeSlot
              key={`${blockIndex}`}
              node={blockNode}
              slotKey={`${messageId}::${blockIndex}`}
            />
          );
        }

        const inlineChildren = blockNode.content ?? [];
        const onlyTextual = inlineChildren.every(
          (child) => child.type === "text" || child.type === "hardBreak",
        );

        if (onlyTextual) {
          const joined = joinTextualInline(inlineChildren);
          return <p key={`${blockIndex}`}>{renderInlineMarkdown(joined)}</p>;
        }

        return (
          <p key={`${blockIndex}`}>
            {renderParagraphInline({
              children: inlineChildren,
              messageId,
              blockIndex,
            })}
          </p>
        );
      })}
    </>
  );
}

function isPureTextualDoc(content: JSONContent): boolean {
  const stack: JSONContent[] = [content];
  while (stack.length) {
    const node = stack.pop();
    if (!node) {
      break;
    }
    if (node.type && !TEXTUAL_NODE_TYPES.has(node.type)) {
      return false;
    }
    if (node.content) {
      for (const child of node.content) {
        stack.push(child);
      }
    }
  }
  return true;
}

function flattenTextualDoc(content: JSONContent): string {
  const blocks = content.content ?? [];
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.type === "paragraph") {
      lines.push(joinTextualInline(block.content ?? []));
    } else if (block.type === "text" && block.text) {
      lines.push(block.text);
    }
  }
  return lines.join("\n");
}

function joinTextualInline(nodes: JSONContent[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "hardBreak") {
      out += "\n";
    } else if (node.type === "text" && typeof node.text === "string") {
      out += node.text;
    }
  }
  return out;
}

interface RenderParagraphInlineArgs {
  children: JSONContent[];
  messageId: string;
  blockIndex: number;
}

function renderParagraphInline(
  args: RenderParagraphInlineArgs,
): React.ReactNode[] {
  const { children, messageId, blockIndex } = args;
  const out: React.ReactNode[] = [];

  // Coalesce consecutive text/hardBreak runs so a paragraph like
  // "Hi @Alice run `npm install`" parses the second segment as inline
  // markdown rather than per-character.
  let textRun = "";
  const flushTextRun = (key: string) => {
    if (!textRun) {
      return;
    }
    out.push(
      <React.Fragment key={key}>
        {renderInlineMarkdown(textRun)}
      </React.Fragment>,
    );
    textRun = "";
  };

  children.forEach((node, inlineIndex) => {
    const baseKey = `${messageId}::${blockIndex}.${inlineIndex}`;

    if (node.type === "text" && typeof node.text === "string") {
      textRun += node.text;
      return;
    }
    if (node.type === "hardBreak") {
      textRun += "\n";
      return;
    }

    flushTextRun(`${baseKey}-text-pre`);

    if (node.type === "mention" || node.type === "command") {
      out.push(<TokenChipMount key={baseKey} node={node} type={node.type} />);
      return;
    }

    out.push(<UnknownNodeSlot key={baseKey} node={node} slotKey={baseKey} />);
  });

  flushTextRun(`${messageId}::${blockIndex}.tail`);

  return out;
}

interface TokenChipMountProps {
  node: JSONContent;
  type: "mention" | "command";
}

function TokenChipMount({ node, type }: TokenChipMountProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);

  // The chip element is rebuilt only when its visible attrs change.
  //
  // We deliberately do NOT forward `renderCustomToken` into the bubble: the
  // editor pipes custom chip content through a portal listener on the chat
  // wrapper (`LightDomPortalsContainer`), which assumes the dispatched event
  // originates from inside the shadow DOM and bridges into light DOM. The
  // bubble chip already lives in light DOM, so reusing that handshake would
  // produce broken slot wiring. Consumers who need custom rendering inside
  // a sent-bubble chip register a `renderUserDefinedInputNode` instead.
  const chip = useMemo(
    () =>
      renderTokenChip({
        attrs: (node.attrs ?? {}) as Record<string, string>,
        type,
      }),
    [node.attrs, type],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }
    host.appendChild(chip);
    return () => {
      if (chip.parentNode === host) {
        host.removeChild(chip);
      }
    };
  }, [chip]);

  return <span ref={hostRef} />;
}

interface UnknownNodeSlotProps {
  node: JSONContent;
  slotKey: string;
}

function UnknownNodeSlot({ node, slotKey }: UnknownNodeSlotProps) {
  // Rendered as a real `<slot>` element so the `InputNodePortalsContainer`
  // can project consumer content from chatWrapper's light DOM into this
  // position. When no consumer renderer is registered (or it returned
  // null), the slot's fallback children — the node's label or value — show
  // through.
  const fallback = (node.attrs?.label ?? node.attrs?.value ?? "") as string;
  const dataProps = {
    [INPUT_NODE_SLOT_ATTR]: slotKey,
    [INPUT_NODE_TYPE_ATTR]: node.type ?? "",
  };
  return (
    <slot name={slotKey} {...dataProps}>
      {fallback}
    </slot>
  );
}

export default MessageRichUserContent;
