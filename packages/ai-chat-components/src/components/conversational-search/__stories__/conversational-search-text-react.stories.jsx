/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import { action } from 'storybook/actions';
import ConversationalSearchText from '../../../react/conversational-search-text';
import Markdown from '../../../react/markdown';
import { Default as DefaultWC } from './conversational-search-text.stories';

function Answer({ args, onToggle }) {
  return (
    <div style={{ maxInlineSize: '40rem' }}>
      <ConversationalSearchText
        citationsOpen={args.citationsOpen}
        showCitationsToggle={args.showCitationsToggle}
        citationsLabel={args.citationsLabel}
        toggleLabel={args.toggleLabel}
        onCitationsToggle={onToggle}>
        <Markdown markdown={args.markdown} streaming={args.streaming} />
      </ConversationalSearchText>
      {args.citationsOpen && args.showCitationsToggle && (
        <p>{args.citationText}</p>
      )}
    </div>
  );
}

function StreamingAnswer({ args }) {
  const [length, setLength] = useState(0);
  const [open, setOpen] = useState(args.citationsOpen);
  useEffect(() => setOpen(args.citationsOpen), [args.citationsOpen]);
  useEffect(() => {
    setLength(0);
    if (!args.streaming) {
      return;
    }
    let nextLength = 0;
    const timer = setInterval(() => {
      nextLength = Math.min(nextLength + 8, args.markdown.length);
      setLength(nextLength);
      if (nextLength === args.markdown.length) {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [args.markdown, args.streaming]);
  return (
    <Answer
      args={{
        ...args,
        citationsOpen: open,
        streaming: args.streaming && length < args.markdown.length,
        markdown: args.streaming
          ? args.markdown.slice(0, length)
          : args.markdown,
      }}
      onToggle={(event) => {
        setOpen(event.detail.open);
        action('citations-toggle')(event.detail);
      }}
    />
  );
}

const { '@cds-aichat-citations-toggle': toggleEvent, ...argTypes } =
  DefaultWC.argTypes;

function answerSource(_source, { args }) {
  return `import { useState } from 'react';
import ConversationalSearchText from '@carbon/ai-chat-components/es/react/conversational-search-text.js';
import Markdown from '@carbon/ai-chat-components/es/react/markdown.js';

function AnswerExample({ onCitationsScroll }) {
  const [citationsOpen, setCitationsOpen] = useState(${JSON.stringify(args.citationsOpen)});
  return (
    <>
      <ConversationalSearchText
        citationsOpen={citationsOpen}
        showCitationsToggle={${JSON.stringify(args.showCitationsToggle)}}
        citationsLabel={${JSON.stringify(args.citationsLabel)}}
        toggleLabel={${JSON.stringify(args.toggleLabel)}}
        onCitationsToggle={(event) => {
          setCitationsOpen(event.detail.open);
          if (event.detail.open) onCitationsScroll();
        }}>
        <Markdown
          markdown={${JSON.stringify(args.markdown)}}
          streaming={${JSON.stringify(args.streaming)}}
        />
      </ConversationalSearchText>
      {citationsOpen && ${JSON.stringify(args.showCitationsToggle)} && (
        <p>{${JSON.stringify(args.citationText)}}</p>
      )}
    </>
  );
}`;
}

export default {
  title: 'Preview/Conversational search/Answer text',
  component: ConversationalSearchText,
  parameters: {
    docs: { source: { type: 'dynamic', transform: answerSource } },
  },
};

export const Default = {
  args: { ...DefaultWC.args },
  argTypes: {
    ...argTypes,
    onCitationsToggle: { ...toggleEvent, control: 'none' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs();
    return (
      <Answer
        args={args}
        onToggle={(event) => {
          updateArgs({ citationsOpen: event.detail.open });
          action('citations-toggle')(event.detail);
        }}
      />
    );
  },
};

export const Open = {
  ...Default,
  args: { ...Default.args, citationsOpen: true },
};

export const WithoutToggle = {
  ...Default,
  args: { ...Default.args, showCitationsToggle: false },
};

export const Highlighted = {
  ...Default,
  args: {
    ...Default.args,
    citationsOpen: true,
    markdown:
      'Carbon provides ==reusable components== and ==accessibility guidance== for your application.',
  },
};

export const Streaming = {
  ...Default,
  args: { ...Default.args, streaming: true },
  render: (args) => <StreamingAnswer args={args} />,
};
