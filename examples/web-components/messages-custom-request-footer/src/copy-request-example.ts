/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Copy button for the messages-custom-request-footer example.
 *
 * Demonstrates: a footer element rendered beneath a user message. It reads the
 * text the user submitted from `message.input.text` and copies it, so someone
 * can reuse or edit an earlier request.
 *
 * Carbon's `cds-copy-button` carries the accessible name and the visible
 * "Copied" feedback, but it swaps its own tooltip rather than announcing
 * through a live region. The `role="status"` element below is what a screen
 * reader reports, so the confirmation is not sighted-only.
 *
 * Created by: the `renderCustomRequestFooter` callback in `./main.ts`.
 */

import { MessageRequest } from '@carbon/ai-chat';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@carbon/web-components/es/components/copy-button/index.js';

const FEEDBACK_TIMEOUT = 2000;

@customElement('copy-request-example')
class CopyRequestExample extends LitElement {
  static styles = css`
    .custom-request-footer-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    /* The status text is for screen readers only; the button shows its own
       "Copied" feedback to sighted users. */
    .custom-request-footer-status {
      position: absolute;
      overflow: hidden;
      clip-path: inset(50%);
      block-size: 1px;
      inline-size: 1px;
      white-space: nowrap;
    }
  `;

  // The library sets this property on the element it creates from the render
  // callback. It is the message as the user submitted it, which is what the
  // bubble above the footer shows.
  @property({ type: Object })
  accessor message!: MessageRequest;

  @state()
  private accessor status = '';

  private timeout: ReturnType<typeof setTimeout> | undefined;

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.timeout);
  }

  private handleCopy = () => {
    const text = this.message?.input?.text;
    if (!text) {
      return;
    }
    // navigator.clipboard needs a secure context. localhost counts as one, so
    // this works in development; behind plain HTTP it does not.
    navigator.clipboard.writeText(text);
    this.status = 'Copied';
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.status = '';
    }, FEEDBACK_TIMEOUT);
  };

  render() {
    // A message can arrive with no text — an upload, for instance — and there
    // is nothing to copy then.
    if (!this.message?.input?.text) {
      return null;
    }

    return html`
      <div class="custom-request-footer-actions">
        <cds-copy-button
          feedback="Copied"
          feedback-timeout=${FEEDBACK_TIMEOUT}
          @click=${this.handleCopy}>
          Copy your message
        </cds-copy-button>
        <span class="custom-request-footer-status" role="status"
          >${this.status}</span
        >
      </div>
    `;
  }
}

export default CopyRequestExample;
