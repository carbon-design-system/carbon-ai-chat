/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Tile } from '@carbon/react';
import UserMessageContent from '../../../react/user-message-content';
import PromptLine from '../../../react/prompt-line';
import PromptLineShell from '../../../react/prompt-line-shell';
import CDSAIChatInputSendControl from '../../../react/input-send-control';
import { useChatAutocomplete } from '../../../react/hooks/useChatAutocomplete';
import { buildCarbonExtensions } from '../../prompt-line/index';
import {
  mentionItems,
  commandItems,
} from '../../prompt-line/__stories__/story-data';
import './story-styles.scss';
import {
  textContent,
  chipContent,
  customNodeContent,
  tileChip,
} from './story-data';
import { Default as DefaultWC } from './user-message-content.stories';

export default {
  title: 'Preview/User message content',
  component: UserMessageContent,
};

const Hint = ({ children }) => (
  <p className="user-message-content-story-hint">{children}</p>
);

const InlineCode = ({ children }) => <code>{children}</code>;

/** Text and markdown only. */
export const Default = {
  argTypes: { ...DefaultWC.argTypes },
  args: { ...DefaultWC.args },
  render: ({ slotPrefix = 'message-1' }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxInlineSize: 640,
      }}>
      <UserMessageContent slotPrefix={slotPrefix} content={textContent} />
    </div>
  ),
};

/** A mention node shows a chip until the host fills its slot. */
export const WithChip = {
  name: 'With Chip',
  argTypes: { ...Default.argTypes },
  args: { ...Default.args },
  render: ({ slotPrefix = 'message-1' }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxInlineSize: 640,
      }}>
      <UserMessageContent slotPrefix={slotPrefix} content={chipContent} />
    </div>
  ),
};

/** Renders a Carbon tile in the slot. */
export const WithCustomNode = {
  name: 'With Custom Node',
  argTypes: { ...Default.argTypes },
  args: { ...Default.args },
  render: ({ slotPrefix = 'message-1' }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxInlineSize: 640,
        marginBlockEnd: 8,
      }}>
      <UserMessageContent slotPrefix={slotPrefix} content={customNodeContent}>
        <Tile slot={`${slotPrefix}::0.1`} style={{ maxInlineSize: 320 }}>
          <strong style={{ display: 'block' }}>{tileChip.label}</strong>
          <span
            style={{
              display: 'block',
              marginBlockStart: '0.25rem',
              color: '#525252',
              fontSize: '0.875rem',
            }}>
            {tileChip.description}
          </span>
        </Tile>
      </UserMessageContent>
    </div>
  ),
};

const TypeSendViewStory = ({ slotPrefix = 'message-1' }) => {
  const [sent, setSent] = useState([]);
  const [hasValidInput, setHasValidInput] = useState(false);
  const draft = useRef(null);
  const promptLineRef = useRef(null);

  const mention = useMemo(
    () => ({
      trigger: '@',
      items: async (query) => {
        if (!query) return mentionItems;
        return mentionItems.filter((m) =>
          m.label.toLowerCase().includes(query.toLowerCase())
        );
      },
    }),
    []
  );

  const command = useMemo(
    () => ({
      trigger: '/',
      triggerPosition: 'start',
      items: commandItems,
    }),
    []
  );

  const extensions = useMemo(
    () => buildCarbonExtensions({ mention, command }),
    [mention, command]
  );

  const { onTriggerChange, autocompleteContent, isListNavigated } =
    useChatAutocomplete({
      mention,
      command,
      promptLineRef,
    });

  const onChange = useCallback((event) => {
    draft.current = event.detail.content ?? null;
    setHasValidInput(
      Boolean(event.detail.rawValue && event.detail.rawValue.length > 0)
    );
  }, []);

  const send = useCallback(() => {
    const prompt = promptLineRef.current;
    const toSend = draft.current;
    if (!toSend || !prompt?.getValue().trim()) {
      return;
    }
    setSent((previous) => [...previous, toSend]);
    draft.current = null;
    prompt.clearContent();
    setHasValidInput(false);
  }, []);

  return (
    <div style={{ inlineSize: 640, maxInlineSize: '100%' }}>
      <Hint>
        Type <InlineCode>@</InlineCode> anywhere to mention a team member. Type{' '}
        <InlineCode>/</InlineCode> at the start of the line to run a command.
      </Hint>
      {sent.map((content, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            maxInlineSize: 640,
            marginBlockEnd: 8,
          }}>
          <UserMessageContent
            slotPrefix={`${slotPrefix}-${index}`}
            content={content}
          />
        </div>
      ))}
      <div style={{ marginBlockStart: 360 }}>
        <PromptLineShell rounded expanded>
          <PromptLine
            ref={promptLineRef}
            slot="editor"
            placeholder="Type a message..."
            rich
            extensions={extensions}
            onChange={onChange}
            onSendIntent={send}
            onTriggerChange={onTriggerChange}
          />
          {autocompleteContent}
          <CDSAIChatInputSendControl
            slot="send-control"
            hasValidInput={hasValidInput}
            disableSend={isListNavigated}
            onSend={send}
          />
        </PromptLineShell>
      </div>
    </div>
  );
};

export const TypeSendView = {
  name: 'Type, Send, View',
  argTypes: { ...Default.argTypes },
  args: { ...Default.args },
  render: (args) => <TypeSendViewStory {...args} />,
};
