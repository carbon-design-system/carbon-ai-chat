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
import UserMessageContent from '../../../react/user-message-content';
import MessageItemShell from '../../../react/message-item-shell';
import MessageByline from '../../../react/message-byline';
import PromptLine from '../../../react/prompt-line';
import PromptLineShell from '../../../react/prompt-line-shell';
import CDSAIChatInputSendControl from '../../../react/input-send-control';
import { useChatAutocomplete } from '../../../react/hooks/useChatAutocomplete';
import { buildCarbonExtensions } from '../../prompt-line/index';
import { mentionItems } from '../../prompt-line/__stories__/story-data';
import { sampleContent } from './story-data';
import {
  Default as DefaultWC,
  TypeSendView as TypeSendViewWC,
} from './user-message-content.stories';

export default {
  title: 'Preview/User message content',
  component: UserMessageContent,
};

const Message = ({ content, slotPrefix, children }) => (
  <MessageItemShell rowType="request">
    <MessageByline slot="byline" label="You" timestamp="10:42 AM" />
    <UserMessageContent slotPrefix={slotPrefix} content={content}>
      {children}
    </UserMessageContent>
  </MessageItemShell>
);

export const Default = {
  argTypes: { ...DefaultWC.argTypes },
  args: { ...DefaultWC.args },
  render: ({ slotPrefix }) => (
    <Message content={sampleContent} slotPrefix={slotPrefix}>
      <strong slot={`${slotPrefix}::0.5`}>Chart 4 (live)</strong>
    </Message>
  ),
};

const TypeSendViewStory = ({ slotPrefix }) => {
  const [sent, setSent] = useState([]);
  const draft = useRef(null);
  const promptLineRef = useRef(null);

  const mention = useMemo(
    () => ({
      trigger: '@',
      items: async (query) =>
        query
          ? mentionItems.filter((item) =>
              item.label.toLowerCase().includes(query.toLowerCase())
            )
          : mentionItems,
    }),
    []
  );
  const extensions = useMemo(
    () => buildCarbonExtensions({ mention }),
    [mention]
  );
  const { onTriggerChange, autocompleteContent } = useChatAutocomplete({
    mention,
    promptLineRef,
  });

  const onChange = useCallback((event) => {
    draft.current = event.detail.content ?? null;
  }, []);

  const send = useCallback(() => {
    const prompt = promptLineRef.current;
    if (!draft.current || !prompt?.getValue().trim()) {
      return;
    }
    setSent((previous) => [...previous, draft.current]);
    draft.current = null;
    prompt.clearContent();
  }, []);

  return (
    <div style={{ inlineSize: 640, maxInlineSize: '100%' }}>
      <p>
        Type a message, use <code>@</code> to mention someone, and send it.
      </p>
      {sent.map((content, index) => (
        <Message
          key={index}
          content={content}
          slotPrefix={`${slotPrefix}-${index}`}
        />
      ))}
      <div style={{ marginBlockStart: 320 }}>
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
          <CDSAIChatInputSendControl slot="send-control" onSend={send} />
        </PromptLineShell>
      </div>
    </div>
  );
};

export const TypeSendView = {
  name: 'Type, send, view',
  argTypes: { ...TypeSendViewWC.argTypes },
  args: { ...TypeSendViewWC.args },
  render: (args) => <TypeSendViewStory {...args} />,
};
