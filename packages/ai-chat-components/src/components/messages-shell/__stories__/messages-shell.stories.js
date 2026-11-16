/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../index';
import { html } from 'lit';
import { map } from 'lit/directives/map.js';
import { action } from 'storybook/actions';
import styles from './story-styles.scss?lit';
import { handleLabelArgs, placeholderMessages, storyClass } from './story-data';

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
};

export const Default = {
  argTypes: {
    topHandleLabel: {
      control: 'text',
      description:
        'Label for the top scroll handle. Provide a translated string. Omit it to hide the handle.',
    },
    bottomHandleLabel: {
      control: 'text',
      description:
        'Label for the bottom scroll handle. Provide a translated string. Omit it to hide the handle.',
    },
    scrollDownButtonLabel: {
      control: 'text',
      description:
        'Accessible label for the built-in scroll-to-bottom button. The button appears automatically when the user scrolls more than 60 px from the bottom. Leave empty to hide it.',
    },
    '@cds-aichat-messages-shell-scroll': {
      action: 'scroll',
      control: 'none',
      table: { category: 'events' },
    },
  },
  args: {
    ...handleLabelArgs,
    scrollDownButtonLabel: 'Scroll to bottom',
  },
  render: (args) => html`
    <div class="${storyClass}-container">
      <cds-aichat-messages-shell
        top-handle-label=${args.topHandleLabel}
        bottom-handle-label=${args.bottomHandleLabel}
        scroll-down-button-label=${args.scrollDownButtonLabel}
        @cds-aichat-messages-shell-scroll=${(e) => action('scroll')(e.detail)}>
        <div slot="notifications" class="${storyClass}-notification">
          Notification slot — e.g. human-agent banner
        </div>
        ${map(
          placeholderMessages,
          (msg, index) => html`
            <div
              id="msg-${index}"
              data-message-id="msg-${index}"
              ?data-aichat-pinnable=${msg.type === 'user'}
              class="${storyClass}-message ${storyClass}-message--${msg.type}">
              ${msg.text}
            </div>
          `
        )}
        <div slot="processing" class="${storyClass}-processing">
          Processing slot (typing indicator goes here)
        </div>
        <div slot="error" class="${storyClass}-error">
          Error slot — e.g. send failure
        </div>
      </cds-aichat-messages-shell>
    </div>
  `,
};

export const NoContent = {
  argTypes: {
    ...Default.argTypes,
  },
  args: {
    ...Default.args,
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
