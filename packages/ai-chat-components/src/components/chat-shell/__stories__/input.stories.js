/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../src/shell.js';
import '../../prompt-line/index.js';
import '@carbon/web-components/es/components/button/index.js';
import Document16 from '@carbon/icons/es/document/16.js';
import Language16 from '@carbon/icons/es/language/16.js';
import Idea16 from '@carbon/icons/es/idea/16.js';

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { action } from 'storybook/actions';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';

import styles from './story-styles.scss?lit';

const dummyActions = [
  { text: 'Summarize conversation', icon: Document16 },
  { text: 'Translate last message', icon: Language16 },
  { text: 'Brainstorm ideas', icon: Idea16 },
];

// ---------------------------------------------------------------------------
// Shared shell chrome used by both stories
// ---------------------------------------------------------------------------

const shellChrome = html`
  <div slot="header" class="header slot-sample">Header</div>
  <div slot="messages" class="messages slot-sample">Messages</div>
`;

// ---------------------------------------------------------------------------
// Story meta
// ---------------------------------------------------------------------------

export default {
  title: 'Preview/Chat shell/Input',
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      ${story()}
    `,
  ],
};

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------

export const Default = {
  parameters: { controls: { disable: true } },
  render: () => {
    let sendControlEl = null;

    const onPromptChange = (e) => {
      if (sendControlEl) {
        sendControlEl.hasValidInput = e.detail.rawValue.length > 0;
      }
      action('cds-aichat-prompt-change')(e.detail);
    };

    return html`
      <cds-aichat-shell show-frame corner-all="round" content-max-width>
        ${shellChrome}
        <cds-aichat-prompt-line-shell slot="input" rounded>
          <cds-aichat-prompt-line
            slot="editor"
            placeholder="Ask a question"
            @cds-aichat-prompt-change=${onPromptChange}
            @cds-aichat-prompt-send-intent=${(e) =>
              action('cds-aichat-prompt-send-intent')(
                e.detail
              )}></cds-aichat-prompt-line>
          <cds-aichat-input-send-control
            slot="send-control"
            button-label="Send"
            @cds-aichat-input-send=${() => action('cds-aichat-input-send')()}
            ${ref((el) => {
              sendControlEl = el ?? null;
            })}></cds-aichat-input-send-control>
        </cds-aichat-prompt-line-shell>
      </cds-aichat-shell>
    `;
  },
};

// ---------------------------------------------------------------------------
// Expanded
// ---------------------------------------------------------------------------

export const Expanded = {
  parameters: { controls: { disable: true } },
  render: () => {
    let sendControlEl = null;

    const onPromptChange = (e) => {
      if (sendControlEl) {
        sendControlEl.hasValidInput = e.detail.rawValue.length > 0;
      }
      action('cds-aichat-prompt-change')(e.detail);
    };

    return html`
      <cds-aichat-shell show-frame corner-all="round" content-max-width>
        ${shellChrome}
        <cds-aichat-prompt-line-shell slot="input" expanded rounded>
          <cds-aichat-prompt-line
            slot="editor"
            placeholder="Ask a question"
            @cds-aichat-prompt-change=${onPromptChange}
            @cds-aichat-prompt-send-intent=${(e) =>
              action('cds-aichat-prompt-send-intent')(
                e.detail
              )}></cds-aichat-prompt-line>
          <div slot="message-actions">
            ${dummyActions.map(
              ({ text, icon }) => html`
                <cds-icon-button
                  size="sm"
                  kind="ghost"
                  align="top-start"
                  enter-delay-ms="0"
                  leave-delay-ms="0"
                  @click=${() => action('dummy-action')(text)}>
                  ${iconLoader(icon, { slot: 'icon' })}
                  <span slot="tooltip-content">${text}</span>
                </cds-icon-button>
              `
            )}
          </div>
          <cds-aichat-input-send-control
            slot="send-control"
            button-label="Send"
            stop-response-label="Stop"
            @cds-aichat-input-send=${() => action('cds-aichat-input-send')()}
            ${ref((el) => {
              sendControlEl = el ?? null;
            })}></cds-aichat-input-send-control>
        </cds-aichat-prompt-line-shell>
      </cds-aichat-shell>
    `;
  },
};
