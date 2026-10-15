/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import '../index';
import { html } from 'lit';
import { map } from 'lit/directives/map.js';
import { action } from 'storybook/actions';
import styles from './story-styles.scss?lit';
import { placeholderMessages, storyClass } from './story-data';

export default {
  title: 'Preview/Messages shell',
  component: 'cds-aichat-messages-shell',
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      ${story()}
    `,
  ],
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
  render: (args) => html`
    <div class="${storyClass}-container">
      <cds-aichat-messages-shell
        top-handle-label=${args.topHandleLabel}
        bottom-handle-label=${args.bottomHandleLabel}
        @cds-aichat-messages-shell-scroll=${(e) => action('scroll')(e.detail)}>
        <div slot="notifications" class="${storyClass}-notification">
          Notification slot — e.g. human-agent banner
        </div>
        ${map(
          placeholderMessages,
          (msg) => html`
            <div
              class="${storyClass}-message ${storyClass}-message--${msg.type}">
              ${msg.text}
            </div>
          `
        )}
        <div slot="processing" class="${storyClass}-processing">
          Processing slot (typing indicator goes here)
        </div>
        <div slot="scroll-down" class="${storyClass}-scroll-down">
          <button type="button" class="${storyClass}-scroll-down-btn">
            ↓ Scroll to bottom
          </button>
        </div>
        <div slot="error" class="${storyClass}-error">
          Error slot — e.g. send failure
        </div>
      </cds-aichat-messages-shell>
    </div>
  `,
};

export const NoContent = {
  args: {
    topHandleLabel: 'Start of messages.',
    bottomHandleLabel: 'End of messages.',
  },
  render: (args) => html`
    <div class="${storyClass}-container">
      <cds-aichat-messages-shell
        top-handle-label=${args.topHandleLabel}
        bottom-handle-label=${args.bottomHandleLabel}>
      </cds-aichat-messages-shell>
    </div>
  `,
};
