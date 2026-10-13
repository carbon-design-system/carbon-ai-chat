/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Structured paragraphs share one page-light host. WebKit cannot select words
// reliably when paragraph text crosses shadow text and separately slotted nodes.

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';
import prefix from '@carbon/ai-chat-components/es/globals/settings.js';
import { installInlineRunStyles } from '@carbon/ai-chat-components/es/components/markdown/src/utils/inline-run-projection.js';
import {
  mountHost,
  bindProjectedOwner,
  resolveInputNodeOwner,
  registerInlineTarget,
  unmountHost,
} from '../components/portals/inputNodeHosts';

import { MarkdownWithDefaults } from '../components/helpers/MarkdownWithDefaults/MarkdownWithDefaults';
import { InlineMarkdown } from '../components/helpers/InlineMarkdown/InlineMarkdown';
import { renderTokenChip } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type { JSONContent } from '@tiptap/core';
import type { MessageRequest } from '../../types/messaging/Messages';

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
          return (
            <p key={`${blockIndex}`}>
              <InlineMarkdown text={joined} />
            </p>
          );
        }

        return (
          <ProjectedParagraph
            key={`${blockIndex}`}
            slotKey={`${messageId}::paragraph.${blockIndex}`}>
            {renderParagraphInline({
              children: inlineChildren,
              messageId,
              blockIndex,
            })}
          </ProjectedParagraph>
        );
      })}
    </>
  );
}

function ProjectedParagraph({
  children,
  slotKey,
}: {
  children: React.ReactNode;
  slotKey: string;
}) {
  const host = useMemo(() => document.createElement('span'), []);
  const sourceRef = useRef<HTMLParagraphElement>(null);
  const [owner, setOwner] = useState<HTMLElement | null | undefined>(undefined);

  useLayoutEffect(() => {
    const resolved = resolveInputNodeOwner(sourceRef.current);
    // Bind before portal children mount; their effects run before this parent's.
    const releaseOwner = resolved
      ? bindProjectedOwner(host, resolved)
      : undefined;
    setOwner(resolved);
    return releaseOwner;
  }, [host]);

  useLayoutEffect(() => {
    if (!owner) {
      return undefined;
    }
    host.slot = slotKey;
    host.className = `${prefix}-markdown-inline-run ${prefix}-markdown-inline-run--reset`;
    mountHost(owner, host, slotKey, true);
    const releaseStyles = installInlineRunStyles(host);
    return () => {
      releaseStyles();
      unmountHost(owner, host, slotKey);
    };
  }, [owner, host, slotKey]);

  return (
    <>
      <p ref={sourceRef}>
        {owner === null ? (
          children
        ) : (
          <slot name={slotKey} data-aichat-input-paragraph-slot={slotKey} />
        )}
      </p>
      {owner && createPortal(children, host)}
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
    out.push(
      <InlineMarkdown
        key={key}
        text={textRun}
        projectPluginOutput={false}
        preserveBoundaryWhitespace
        trimStartBreaks={out.length === 0}
        trimEndBreaks={key === `${messageId}::${blockIndex}.tail`}
      />
    );
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

    out.push(
      <UnknownNodeSlot key={baseKey} node={node} slotKey={baseKey} inline />
    );
  });

  flushTextRun(`${messageId}::${blockIndex}.tail`);

  return out;
}

interface UnknownNodeSlotProps {
  inline?: boolean;
  node: JSONContent;
  slotKey: string;
}

function UnknownNodeSlot({
  node,
  slotKey,
  inline = false,
}: UnknownNodeSlotProps) {
  const targetRef = useRef<HTMLSpanElement>(null);
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const slotRef = useRef<HTMLSlotElement | null>(null);
  const [hasAssignedContent, setHasAssignedContent] = useState(false);

  useLayoutEffect(() => {
    if (inline) {
      const owner = resolveInputNodeOwner(targetRef.current);
      return owner
        ? registerInlineTarget(
            owner,
            slotKey,
            targetRef.current,
            hostRef.current
          )
        : undefined;
    }
    const slot = slotRef.current;
    const update = () => setHasAssignedContent(slot.assignedNodes().length > 0);
    update();
    slot.addEventListener('slotchange', update);
    return () => slot.removeEventListener('slotchange', update);
  }, [inline, slotKey]);
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
  if (inline) {
    return (
      <span ref={targetRef} {...dataProps}>
        <span ref={hostRef}>{isTokenNode ? null : fallback}</span>
      </span>
    );
  }
  return (
    <>
      <slot ref={slotRef} name={slotKey} {...dataProps} />
      {/* Firefox omits slot fallback children from native clipboard text. */}
      <span ref={hostRef} hidden={hasAssignedContent}>
        {isTokenNode ? null : fallback}
      </span>
    </>
  );
}
