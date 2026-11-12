/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../index';
import '../../prompt-line/index';
import '@carbon/web-components/es/components/tile/index.js';
import { html, LitElement } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';
import { buildCarbonExtensions } from '../../prompt-line/index';
import {
  mentionItems,
  commandItems,
} from '../../prompt-line/__stories__/story-data';
import {
  textContent,
  chipContent,
  customNodeContent,
  tileChip,
} from './story-data';
import './story-styles.scss';

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

/** Text and markdown only. */
export const Default = {
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <div
      style="display: flex; flex-direction: column; align-items: flex-end; max-inline-size: 640px;">
      <cds-aichat-user-message-content
        slot-prefix=${args.slotPrefix}
        .content=${textContent}></cds-aichat-user-message-content>
    </div>
  `,
};

/** A mention node shows a chip until the host fills its slot. */
export const WithChip = {
  name: 'With Chip',
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <div
      style="display: flex; flex-direction: column; align-items: flex-end; max-inline-size: 640px;">
      <cds-aichat-user-message-content
        slot-prefix=${args.slotPrefix}
        .content=${chipContent}></cds-aichat-user-message-content>
    </div>
  `,
};

/** Renders a Carbon tile in the slot. */
export const WithCustomNode = {
  name: 'With Custom Node',
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <div
      style="display: flex; flex-direction: column; align-items: flex-end; max-inline-size: 640px;">
      <cds-aichat-user-message-content
        slot-prefix=${args.slotPrefix}
        .content=${customNodeContent}>
        <cds-tile
          slot="${args.slotPrefix}::0.1"
          style="max-inline-size: 320px;">
          <strong style="display: block;">${tileChip.label}</strong>
          <span
            style="display: block; margin-block-start: 0.25rem; color: #525252; font-size: 0.875rem;"
            >${tileChip.description}</span
          >
        </cds-tile>
      </cds-aichat-user-message-content>
    </div>
  `,
};

class UserMessageContentComposerStory extends LitElement {
  static properties = {
    slotPrefix: { attribute: false },
    _sent: { state: true },
    _listNavigated: { state: true },
  };

  constructor() {
    super();
    this.slotPrefix = 'message-1';
    this._sent = [];
    this._listNavigated = false;
    this._draft = null;
    this._promptLine = createRef();
    this._sendControlRef = createRef();
    this._mention = {
      trigger: '@',
      items: async (query) => {
        if (!query) {
          return mentionItems;
        }
        return mentionItems.filter((m) =>
          m.label.toLowerCase().includes(query.toLowerCase())
        );
      },
    };
    this._command = {
      trigger: '/',
      triggerPosition: 'start',
      items: commandItems,
    };
    this._extensions = buildCarbonExtensions({
      mention: this._mention,
      command: this._command,
    });
  }

  createRenderRoot() {
    return this;
  }

  _onChange(event) {
    this._draft = event.detail.content ?? null;
    if (this._sendControlRef.value) {
      this._sendControlRef.value.hasValidInput = Boolean(
        event.detail.rawValue && event.detail.rawValue.length > 0
      );
    }
  }

  _onListNavigated(e) {
    this._listNavigated = e.detail.navigated;
  }

  _send() {
    const toSend = this._draft;
    if (!toSend || !this._promptLine.value?.getValue().trim()) {
      return;
    }
    this._sent = [...this._sent, toSend];
    this._draft = null;
    this._promptLine.value.clearContent();
    if (this._sendControlRef.value) {
      this._sendControlRef.value.hasValidInput = false;
    }
  }

  render() {
    return html`
      <div style="inline-size: 640px; max-inline-size: 100%;">
        <p class="user-message-content-story-hint">
          Type <code>@</code> anywhere to mention a team member. Type
          <code>/</code> at the start of the line to run a command.
        </p>
        ${this._sent.map(
          (content, index) => html`
            <div
              style="display: flex; flex-direction: column; align-items: flex-end; max-inline-size: 640px; margin-block-end: 8px;">
              <cds-aichat-user-message-content
                slot-prefix="${this.slotPrefix}-${index}"
                .content=${content}></cds-aichat-user-message-content>
            </div>
          `
        )}
        <div style="margin-block-start: 360px;">
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
              .mention=${this._mention}
              .command=${this._command}
              @cds-aichat-autocomplete-navigated=${(e) =>
                this._onListNavigated(e)}></cds-aichat-autocomplete-controller>
            <cds-aichat-input-send-control
              slot="send-control"
              ?disable-send=${this._listNavigated}
              @cds-aichat-input-send=${() => this._send()}
              ${ref(this._sendControlRef)}></cds-aichat-input-send-control>
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
  name: 'Type, Send, View',
  argTypes,
  args: defaultArgs,
  render: (args) => {
    const el = document.createElement('user-message-content-story-composer');
    el.slotPrefix = args.slotPrefix;
    return el;
  },
};
