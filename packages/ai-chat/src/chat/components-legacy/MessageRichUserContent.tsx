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
 *   Structured: at least one node anywhere in the doc has a type outside
 *   `TEXTUAL_NODE_TYPES`. Top-level non-`paragraph` blocks go straight to
 *   `UnknownNodeSlot`. Paragraph nodes walk their inline children:
 *   text/hardBreak runs use `renderInlineMarkdown`; every other inline node
 *   — including `mention` and `command` — goes to `UnknownNodeSlot`.
 *   `UnknownNodeSlot` emits a `<slot name={slotKey}>`; `InputNodePortalsContainer`
 *   walks the same `display_content`, derives the identical slot key, and
 *   projects the consumer's `renderUserDefinedInputNode` output into it.
 *   When the renderer returns `null` (or none is registered), the slot's
 *   fallback shows through: the default `renderTokenChip` chip for `mention`
 *   and `command`, or the node's `label`/`value` text for other custom nodes.
 *   The slot-key scheme is shared via `collectInputNodeSlots` and pinned by
 *   `messageRichUserContentSlots_spec`.
 */

import React, { useEffect, useMemo, useRef } from 'react';

import { MarkdownWithDefaults } from '../components/helpers/MarkdownWithDefaults/MarkdownWithDefaults';
import { renderInlineMarkdown } from '../components/helpers/InlineMarkdown/InlineMarkdown';
import { renderTokenChip } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type { JSONContent } from '@tiptap/core';
import type { MessageRequest } from '../../types/messaging/Messages';

/**
 * Data attribute mirroring the `<slot>` name for an unknown TipTap node type.
 * `InputNodePortalsContainer` matches the slot by its `name`; this attribute
 * exists so the slot is also queryable (e.g. by the slot-key contract test).
 */
export const INPUT_NODE_SLOT_ATTR = 'data-aichat-input-node-slot';
const INPUT_NODE_TYPE_ATTR = 'data-aichat-input-node-type';

interface MessageRichUserContentProps {
  content: JSONContent;
  message: MessageRequest;
}

const TEXTUAL_NODE_TYPES = new Set(['doc', 'paragraph', 'text', 'hardBreak']);

export function MessageRichUserContent({
  content,
  message,
}: MessageRichUserContentProps) {
  const messageId = message.id ?? 'unknown';
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
        if (blockNode.type !== 'paragraph') {
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
          (child) => child.type === 'text' || child.type === 'hardBreak'
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
    if (block.type === 'paragraph') {
      lines.push(joinTextualInline(block.content ?? []));
    } else if (block.type === 'text' && block.text) {
      lines.push(block.text);
    }
  }
  return lines.join('\n');
}

function joinTextualInline(nodes: JSONContent[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      out += '\n';
    } else if (node.type === 'text' && typeof node.text === 'string') {
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
  args: RenderParagraphInlineArgs
): React.ReactNode[] {
  const { children, messageId, blockIndex } = args;
  const out: React.ReactNode[] = [];

  // Coalesce consecutive text/hardBreak runs so a paragraph like
  // "Hi @Alice run `npm install`" parses the second segment as inline
  // markdown rather than per-character.
  let textRun = '';
  const flushTextRun = (key: string) => {
    if (!textRun) {
      return;
    }
    // The block-level markdown parser trims leading/trailing whitespace from
    // each run it parses. When a chip splits a paragraph into separate runs,
    // the space between the chip and the adjacent text gets eaten. Capture the
    // boundary whitespace explicitly and emit it as plain text siblings so the
    // rendered bubble matches what the user composed.
    const leading = textRun.match(/^\s+/)?.[0] ?? '';
    const afterLeading = textRun.slice(leading.length);
    const trailing = afterLeading.match(/\s+$/)?.[0] ?? '';
    const trimmed = afterLeading.slice(
      0,
      afterLeading.length - trailing.length
    );
    if (leading) {
      out.push(...renderBoundaryWhitespace(leading, `${key}-ws-pre`));
    }
    if (trimmed) {
      out.push(
        <React.Fragment key={key}>
          {renderInlineMarkdown(trimmed)}
        </React.Fragment>
      );
    }
    if (trailing) {
      out.push(...renderBoundaryWhitespace(trailing, `${key}-ws-post`));
    }
    textRun = '';
  };

  children.forEach((node, inlineIndex) => {
    const baseKey = `${messageId}::${blockIndex}.${inlineIndex}`;

    if (node.type === 'text' && typeof node.text === 'string') {
      textRun += node.text;
      return;
    }
    if (node.type === 'hardBreak') {
      textRun += '\n';
      return;
    }

    flushTextRun(`${baseKey}-text-pre`);

    out.push(<UnknownNodeSlot key={baseKey} node={node} slotKey={baseKey} />);
  });

  flushTextRun(`${messageId}::${blockIndex}.tail`);

  // The block parser drops a break at the very start or end of a paragraph, so
  // the chip path drops it too. Without this a chip-bearing paragraph renders a
  // blank first or last line that the same text without a chip does not. The
  // scan steps over whitespace because `renderBoundaryWhitespace` emits the
  // spaces around a break as their own sibling, so the break is not always the
  // edge node; that whitespace goes with it, matching what the block parser
  // trims. Whitespace with no break beside it is left alone — it is the chip
  // spacing the boundary capture exists for.
  const isBreak = (node: React.ReactNode) =>
    React.isValidElement(node) && node.type === 'br';
  const isBlankText = (node: React.ReactNode) =>
    React.isValidElement(node) &&
    node.type === React.Fragment &&
    !String((node.props as { children?: unknown }).children ?? '').trim();

  let start = 0;
  for (let index = 0; index < out.length; index++) {
    if (isBreak(out[index])) {
      start = index + 1;
    } else if (!isBlankText(out[index])) {
      break;
    }
  }
  let end = out.length;
  for (let index = out.length - 1; index >= start; index--) {
    if (isBreak(out[index])) {
      end = index;
    } else if (!isBlankText(out[index])) {
      break;
    }
  }

  return out.slice(start, end);
}

/**
 * A `hardBreak` contributes a `\n` to the run, so a break adjacent to a chip is
 * captured as boundary whitespace and never reaches the inline token walker
 * that turns breaks into `<br>`. Emit it here instead; the spaces around it
 * stay plain text so the boundary-whitespace behavior is unchanged.
 */
function renderBoundaryWhitespace(
  whitespace: string,
  keyPrefix: string
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  whitespace.split('\n').forEach((segment, index) => {
    if (index > 0) {
      out.push(<br key={`${keyPrefix}-br-${index}`} />);
    }
    if (segment) {
      out.push(
        <React.Fragment key={`${keyPrefix}-${index}`}>{segment}</React.Fragment>
      );
    }
  });
  return out;
}

interface UnknownNodeSlotProps {
  node: JSONContent;
  slotKey: string;
}

function UnknownNodeSlot({ node, slotKey }: UnknownNodeSlotProps) {
  // Rendered as a real `<slot>` element so the `InputNodePortalsContainer`
  // can project consumer content from chatWrapper's light DOM into this
  // position. When the renderer returns `null` or none is registered, the
  // slot's fallback children show through.
  //
  // For `mention` and `command` nodes the fallback is the default
  // `renderTokenChip` chip. For all other custom nodes it is the node's
  // `label` or `value` as plain text.
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const isTokenNode = node.type === 'mention' || node.type === 'command';

  // Chip element is rebuilt only when its visible attrs change.
  const chip = useMemo(
    () =>
      isTokenNode
        ? renderTokenChip({
            attrs: (node.attrs ?? {}) as Record<string, string>,
            type: node.type as 'mention' | 'command',
            context: 'historical',
          })
        : null,
    [isTokenNode, node.attrs, node.type]
  );

  useEffect(() => {
    if (!chip || !hostRef.current) {
      return undefined;
    }
    const host = hostRef.current;
    host.appendChild(chip);
    return () => {
      if (chip.parentNode === host) {
        host.removeChild(chip);
      }
    };
  }, [chip]);

  const fallback = (node.attrs?.label ?? node.attrs?.value ?? '') as string;
  const dataProps = {
    [INPUT_NODE_SLOT_ATTR]: slotKey,
    [INPUT_NODE_TYPE_ATTR]: node.type ?? '',
  };
  return (
    <slot name={slotKey} {...dataProps}>
      {isTokenNode ? <span ref={hostRef} /> : fallback}
    </slot>
  );
}
