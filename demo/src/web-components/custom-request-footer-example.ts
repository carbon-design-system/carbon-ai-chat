/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageRequest } from '@carbon/ai-chat';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@carbon/web-components/es/components/copy-button/index.js';

@customElement('custom-request-footer-example')
class CustomRequestFooterExample extends LitElement {
  static styles = css`
    .custom-request-footer-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .custom-request-footer-status {
      position: absolute;
      overflow: hidden;
      clip-path: inset(50%);
      block-size: 1px;
      inline-size: 1px;
      white-space: nowrap;
    }
  `;

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
    navigator.clipboard.writeText(text);
    this.status = 'Copied';
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.status = '';
    }, 2000);
  };

  render() {
    // A message can arrive with no text — an upload, for instance — and there
    // is nothing to copy then.
    if (!this.message?.input?.text) {
      return null;
    }

    return html`
      <div class="custom-request-footer-actions">
        <cds-copy-button feedback="Copied" @click=${this.handleCopy}>
          Copy your message
        </cds-copy-button>
        <span class="custom-request-footer-status" role="status"
          >${this.status}</span
        >
      </div>
    `;
  }
}

export default CustomRequestFooterExample;
