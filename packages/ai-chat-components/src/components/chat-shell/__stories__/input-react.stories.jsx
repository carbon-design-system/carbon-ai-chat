/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
import React, { useState, useCallback } from 'react';
import { action } from 'storybook/actions';

import '@carbon/web-components/es/components/button/index.js';
import Document16 from '@carbon/icons/es/document/16.js';
import Language16 from '@carbon/icons/es/language/16.js';
import Idea16 from '@carbon/icons/es/idea/16.js';
import { carbonIconToReact } from '../../../globals/utils/iconTransform';

import ChatShell from '../../../react/chat-shell.js';
import PromptLine from '../../../react/prompt-line.js';
import PromptLineShell from '../../../react/prompt-line-shell.js';
import CDSAIChatInputSendControl from '../../../react/input-send-control.js';

import './story-styles.scss';

const DocumentIcon = carbonIconToReact(Document16);
const LanguageIcon = carbonIconToReact(Language16);
const IdeaIcon = carbonIconToReact(Idea16);

const dummyActions = [
  { text: 'Summarize conversation', Icon: DocumentIcon },
  { text: 'Translate last message', Icon: LanguageIcon },
  { text: 'Brainstorm ideas', Icon: IdeaIcon },
];

// ---------------------------------------------------------------------------
// Shared shell chrome
// ---------------------------------------------------------------------------

const CoreSlotContent = () => (
  <>
    <div slot="header" className="header slot-sample">
      Header
    </div>
    <div slot="messages" className="messages slot-sample">
      Messages
    </div>
  </>
);

// ---------------------------------------------------------------------------
// Story meta
// ---------------------------------------------------------------------------

export default {
  title: 'Preview/Chat shell/Input',
};

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------

const DefaultStory = () => {
  const [hasValidInput, setHasValidInput] = useState(false);

  const onChange = useCallback((e) => {
    setHasValidInput(e.detail.rawValue.length > 0);
    action('cds-aichat-prompt-change')(e.detail);
  }, []);

  return (
    <ChatShell showFrame cornerAll="round" contentMaxWidth>
      <CoreSlotContent />
      <PromptLineShell slot="input" rounded>
        <PromptLine
          slot="editor"
          placeholder="Ask a question"
          onChange={onChange}
          onSendIntent={(e) =>
            action('cds-aichat-prompt-send-intent')(e.detail)
          }
        />
        <CDSAIChatInputSendControl
          slot="send-control"
          hasValidInput={hasValidInput}
          buttonLabel="Send"
          onSend={() => action('cds-aichat-input-send')()}
        />
      </PromptLineShell>
    </ChatShell>
  );
};

export const Default = {
  parameters: { controls: { disable: true } },
  render: () => <DefaultStory />,
};

// ---------------------------------------------------------------------------
// Expanded
// ---------------------------------------------------------------------------

export const Expanded = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [hasValidInput, setHasValidInput] = useState(false);

    const onChange = useCallback((e) => {
      setHasValidInput(e.detail.rawValue.length > 0);
      action('cds-aichat-prompt-change')(e.detail);
    }, []);

    return (
      <ChatShell showFrame cornerAll="round" contentMaxWidth>
        <CoreSlotContent />
        <PromptLineShell slot="input" expanded rounded>
          <PromptLine
            slot="editor"
            placeholder="Ask a question"
            onChange={onChange}
            onSendIntent={(e) =>
              action('cds-aichat-prompt-send-intent')(e.detail)
            }
          />
          <div slot="message-actions">
            {dummyActions.map(({ text, Icon }) => (
              <cds-icon-button
                key={text}
                size="sm"
                kind="ghost"
                align="top-start"
                enter-delay-ms="0"
                leave-delay-ms="0"
                onClick={() => action('dummy-action')(text)}>
                <Icon slot="icon" />
                <span slot="tooltip-content">{text}</span>
              </cds-icon-button>
            ))}
          </div>
          <CDSAIChatInputSendControl
            slot="send-control"
            hasValidInput={hasValidInput}
            buttonLabel="Send"
            onSend={() => action('cds-aichat-input-send')()}
          />
        </PromptLineShell>
      </ChatShell>
    );
  },
};
