/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import { observeWriteableSlotPresence } from '../../../utils/writeableSlotPresence';
import type { WriteableElementName } from '../../../../types/instance/WriteableElements';

@carbonElement('cds-aichat-prompt-line-slot')
class PromptLineSlot extends LitElement {
  @property({ attribute: false }) slotName: WriteableElementName;
  @property({ attribute: false }) wrapperSlot = '';
  private releasePresence?: () => void;
  private observedSlot?: HTMLSlotElement;
  private observedName?: WriteableElementName;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    this.hidden = true;
    this.setAttribute('data-prompt-line-slot', '');
    this.setAttribute('data-floating-menu-container', '');
    super.connectedCallback();
    this.requestUpdate();
  }

  disconnectedCallback() {
    this.releasePresence?.();
    this.releasePresence = undefined;
    this.observedSlot = undefined;
    super.disconnectedCallback();
  }

  protected updated() {
    this.slot = this.wrapperSlot;
    const slot = this.querySelector('slot');
    if (
      !this.isConnected ||
      (slot === this.observedSlot && this.observedName === this.slotName)
    ) {
      return;
    }
    this.releasePresence?.();
    this.observedSlot = slot;
    this.observedName = this.slotName;
    if (slot) {
      this.releasePresence = observeWriteableSlotPresence(slot, (present) => {
        this.hidden = !present;
      });
    }
  }

  protected render() {
    return html`<slot name=${this.slotName}></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-prompt-line-slot': PromptLineSlot;
  }
}

export default PromptLineSlot;
