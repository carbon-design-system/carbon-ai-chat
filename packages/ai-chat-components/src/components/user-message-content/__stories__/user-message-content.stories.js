/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../index';
import '../../message-item-shell/index';
import '../../message-byline/index';
import '../../prompt-line/index';
import { html, LitElement, nothing } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';
import { buildCarbonExtensions } from '../../prompt-line/index';
import { mentionItems } from '../../prompt-line/__stories__/story-data';
import { sampleContent } from './story-data';

export default {
  title: 'Preview/User message content',
  component: 'cds-aichat-user-message-content',
};

const argTypes = {
  slotPrefix: {
    control: 'text',
    description:
      'Prefix for slot names, `${slotPrefix}::${path}`. Use a value unique to the message.',
  },
};

const defaultArgs = {
  slotPrefix: 'message-1',
};

/** Renders a sent message the way the chat does: a request row in the shell. */
const renderMessage = (content, args) => html`
  <cds-aichat-message-item-shell row-type="request">
    <cds-aichat-message-byline
      slot="byline"
      label="You"
      timestamp="10:42 AM"></cds-aichat-message-byline>
    <cds-aichat-user-message-content
      slot-prefix=${args.slotPrefix}
      .content=${content}>
      ${
        // The host fills the chart slot. An unfilled slot shows its label.
        content === sampleContent
          ? html`<strong slot="${args.slotPrefix}::0.5">Chart 4 (live)</strong>`
          : nothing
      }
    </cds-aichat-user-message-content>
  </cds-aichat-message-item-shell>
`;

export const Default = {
  argTypes,
  args: defaultArgs,
  render: (args) => renderMessage(sampleContent, args),
};

class UserMessageContentComposerStory extends LitElement {
  static properties = {
    slotPrefix: { attribute: false },
    _sent: { state: true },
  };

  constructor() {
    super();
    this.slotPrefix = 'message-1';
    this._sent = [];
    this._draft = null;
    this._promptLine = createRef();
    this._mention = {
      trigger: '@',
      items: async (query) =>
        query
          ? mentionItems.filter((item) =>
              item.label.toLowerCase().includes(query.toLowerCase())
            )
          : mentionItems,
    };
    this._extensions = buildCarbonExtensions({ mention: this._mention });
  }

  createRenderRoot() {
    return this;
  }

  _onChange(event) {
    this._draft = event.detail.content ?? null;
  }

  _send() {
    if (!this._draft || !this._promptLine.value?.getValue().trim()) {
      return;
    }
    this._sent = [...this._sent, this._draft];
    this._draft = null;
    this._promptLine.value.clearContent();
  }

  render() {
    return html`
      <div style="inline-size: 640px; max-inline-size: 100%;">
        <p>
          Type a message, use <code>@</code> to mention someone, and send it.
        </p>
        ${this._sent.map((content, index) =>
          renderMessage(content, {
            slotPrefix: `${this.slotPrefix}-${index}`,
          })
        )}
        <div style="margin-block-start: 320px;">
          <cds-aichat-prompt-line-shell rounded expanded>
            <cds-aichat-prompt-line
              slot="editor"
              placeholder="Type a message..."
              rich
              .extensions=${this._extensions}
              @cds-aichat-prompt-change=${(e) => this._onChange(e)}
              @cds-aichat-prompt-send-intent=${() => this._send()}
              ${ref(this._promptLine)}></cds-aichat-prompt-line>
            <cds-aichat-autocomplete-controller
              slot="autocomplete-content"
              .mention=${this._mention}></cds-aichat-autocomplete-controller>
            <cds-aichat-input-send-control
              slot="send-control"
              @cds-aichat-input-send=${() =>
                this._send()}></cds-aichat-input-send-control>
          </cds-aichat-prompt-line-shell>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('user-message-content-story-composer')) {
  customElements.define(
    'user-message-content-story-composer',
    UserMessageContentComposerStory
  );
}

/**
 * Type a message with a mention, send it, and see the captured document
 * through `cds-aichat-user-message-content`.
 */
export const TypeSendView = {
  name: 'Type, send, view',
  argTypes,
  args: defaultArgs,
  render: (args) => {
    const el = document.createElement('user-message-content-story-composer');
    el.slotPrefix = args.slotPrefix;
    return el;
  },
};
