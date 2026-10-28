/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import { NativeChatView } from '../../shared/NativeChatView';

@carbonElement('cds-aichat-confirmation-body')
class ConfirmationBody extends NativeChatView {
  @property({ attribute: false })
  panelTitle = '';

  @property({ attribute: false })
  message = '';

  protected onViewConnected() {}

  protected renderView() {
    return html`<div class="cds-aichat--confirm-panel__content">
      <h2
        class="cds-aichat--confirm-panel__title"
        .textContent=${this.panelTitle}></h2>
      <p
        class="cds-aichat--confirm-panel__message"
        .textContent=${this.message}></p>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-confirmation-body': ConfirmationBody;
  }
}
