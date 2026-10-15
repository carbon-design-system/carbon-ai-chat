/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import MessagesShell from '../../../react/messages-shell';
import { action } from 'storybook/actions';
import './story-styles.scss';
import { placeholderMessages, storyClass } from './story-data';

export default {
  title: 'Preview/Messages shell',
  component: MessagesShell,
  parameters: {
    docs: {
      description: {
        component:
          'Layout container for the chat message list. Provides named slots for notifications, rows, processing indicator, scroll-to-bottom control, and footer errors. **Experimental** — autoscroll and keyboard navigation are added in future issues.',
      },
    },
  },
  argTypes: {
    topHandleLabel: {
      control: 'text',
      description:
        'Accessible label for the top scroll handle. Provide a translated string.',
    },
    bottomHandleLabel: {
      control: 'text',
      description:
        'Accessible label for the bottom scroll handle. Provide a translated string.',
    },
  },
};

export const Default = {
  args: {
    topHandleLabel: 'Start of messages. Press Enter to move focus to messages.',
    bottomHandleLabel:
      'End of messages. Press Enter to move focus to last message.',
  },
  render: ({ topHandleLabel, bottomHandleLabel }) => (
    <div className={`${storyClass}-container`}>
      <MessagesShell
        topHandleLabel={topHandleLabel}
        bottomHandleLabel={bottomHandleLabel}
        onScroll={(e) => action('scroll')(e.detail)}>
        <div slot="notifications" className={`${storyClass}-notification`}>
          Notification slot — e.g. human-agent banner
        </div>
        {placeholderMessages.map((msg, i) => (
          <div
            key={i}
            className={`${storyClass}-message ${storyClass}-message--${msg.type}`}>
            {msg.text}
          </div>
        ))}
        <div slot="processing" className={`${storyClass}-processing`}>
          Processing slot (typing indicator goes here)
        </div>
        <div slot="scroll-down" className={`${storyClass}-scroll-down`}>
          <button type="button" className={`${storyClass}-scroll-down-btn`}>
            ↓ Scroll to bottom
          </button>
        </div>
        <div slot="error" className={`${storyClass}-error`}>
          Error slot — e.g. send failure
        </div>
      </MessagesShell>
    </div>
  ),
};

export const NoContent = {
  args: {
    topHandleLabel: 'Start of messages.',
    bottomHandleLabel: 'End of messages.',
  },
  render: ({ topHandleLabel, bottomHandleLabel }) => (
    <div className={`${storyClass}-container`}>
      <MessagesShell
        topHandleLabel={topHandleLabel}
        bottomHandleLabel={bottomHandleLabel}
      />
    </div>
  ),
};
