/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Replace the composer through the customPromptLine slot using AI Chat input components.
 * Start at render for the slot, then send for the host-owned draft.
 * onAfterRender subscribes to public state; the host owns errors and uploads.
 */
import '@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js';
import '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line-shell.js';
import '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line.js';
import '@carbon/ai-chat-components/es/components/prompt-line/src/send-control.js';
import type {
  InputChangeEventDetail,
  PromptLineElement,
} from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import { BusEventType, type ChatInstance } from '@carbon/ai-chat';
import { css, html, LitElement, nothing, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { customSendMessage } from './customSendMessage';
import { isSendBlocked } from './isSendBlocked';
import composerStyles from './composer.css?inline';

@customElement('my-app')
export class Demo extends LitElement {
  static styles = [
    css`
      .chat-custom-element {
        block-size: calc(100vh - 1rem);
        inline-size: 100%;
      }
    `,
    unsafeCSS(composerStyles),
  ];

  private instance?: ChatInstance;
  private unsubscribe?: () => void;
  @state() private custom = true;
  @state() private text = '';
  @state() private busy = false;
  @state() private blocked = true;
  @state() private error = '';

  private setup = (instance: ChatInstance) => {
    this.unsubscribe?.();
    this.instance = instance;
    const update = () => {
      this.blocked = isSendBlocked(instance.getState());
    };
    // Public state keeps host controls in sync with loading and uploads.
    const subscription = { type: BusEventType.STATE_CHANGE, handler: update };
    instance.on(subscription);
    this.unsubscribe = () => {
      instance.off(subscription);
    };
    update();
  };

  private send = async () => {
    if (
      !this.instance ||
      this.busy ||
      !this.text.trim() ||
      isSendBlocked(this.instance.getState())
    ) {
      return;
    }
    this.renderRoot
      .querySelector<PromptLineElement>('cds-aichat-prompt-line')
      ?.focus();
    this.busy = true;
    this.error = '';
    try {
      await this.instance.send({
        input: {
          text: this.text,
          structured_data: { fields: [{ id: 'composer', value: 'custom' }] },
        },
      });
      this.text = '';
    } catch {
      this.error = 'Message not sent. Your draft is saved. Try again.';
    } finally {
      this.busy = false;
    }
  };

  disconnectedCallback() {
    this.unsubscribe?.();
    super.disconnectedCallback();
  }

  render() {
    return html`
      <label
        ><input
          type="checkbox"
          .checked=${this.custom}
          @change=${(event: Event) => {
            this.custom = (event.target as HTMLInputElement).checked;
          }} />Use custom prompt line</label
      >
      <cds-aichat-custom-element
        class="chat-custom-element"
        .messaging=${{ customSendMessage }}
        .layout=${{ showFrame: false }}
        .openChatByDefault=${true}
        .onAfterRender=${this.setup}>
        ${
          this.custom
            ? html` <section
                slot="customPromptLine"
                class="composer"
                aria-label="Custom composer"
                aria-busy=${this.busy}>
                <cds-aichat-prompt-line-shell rounded>
                  <cds-aichat-prompt-line
                    slot="editor"
                    aria-label="Your message"
                    placeholder="Write your message"
                    .content=${this.text}
                    .disabled=${this.busy}
                    @cds-aichat-prompt-change=${(
                      event: CustomEvent<InputChangeEventDetail>
                    ) => {
                      this.text = event.detail.rawValue;
                    }}
                    @cds-aichat-prompt-send-intent=${this.send}>
                  </cds-aichat-prompt-line>
                  <cds-aichat-input-send-control
                    slot="send-control"
                    button-label="Send message"
                    .hasValidInput=${Boolean(this.text.trim())}
                    .disableSend=${this.busy || this.blocked}
                    @cds-aichat-input-send=${this.send}>
                  </cds-aichat-input-send-control>
                </cds-aichat-prompt-line-shell>
                <p>Enter sends. Shift+Enter adds a new line.</p>
                <p role="status">
                  ${this.busy ? 'Sending…' : this.blocked ? 'Waiting for chat to be ready.' : ''}
                </p>
                <p role="alert">${this.error}</p>
              </section>`
            : nothing
        }
      </cds-aichat-custom-element>
    `;
  }
}
