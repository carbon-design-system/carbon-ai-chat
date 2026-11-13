/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import '@carbon/web-components/es/components/button/index.js';
import '@carbon/web-components/es/components/dropdown/index.js';

import { PublicConfig } from '@carbon/ai-chat';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * The window event that tells the demo app to remount its chat element. A
 * remount inside the grace window shows whether `lifecycle.reuseInstance`
 * keeps the conversation.
 */
export const REMOUNT_CHAT_EVENT = 'demo-remount-chat';

@customElement('demo-lifecycle-switcher')
export class DemoLifecycleSwitcher extends LitElement {
  static styles = css`
    cds-button {
      margin-block-start: 1rem;
    }
  `;

  @property({ type: Object })
  accessor config!: PublicConfig;

  dropdownSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    const reuseInstance = customEvent.detail.item.value === 'true';
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: {
          ...this.config,
          lifecycle: reuseInstance ? { reuseInstance } : undefined,
        },
        bubbles: true,
        composed: true,
      })
    );
  };

  remount = () => {
    window.dispatchEvent(new CustomEvent(REMOUNT_CHAT_EVENT));
  };

  render() {
    const currentValue = this.config.lifecycle?.reuseInstance
      ? 'true'
      : 'false';

    return html`<cds-dropdown
        value="${currentValue}"
        title-text="Remount behavior"
        helper-text="With reuse on, a chat removed and added back within 3 seconds keeps its conversation."
        @cds-dropdown-selected=${this.dropdownSelected}>
        <cds-dropdown-item value="false">New chat (default)</cds-dropdown-item>
        <cds-dropdown-item value="true">Reuse the chat</cds-dropdown-item>
      </cds-dropdown>
      <cds-button
        kind="tertiary"
        size="sm"
        data-testid="demo_remount_chat_button"
        @click=${this.remount}>
        Remount the chat
      </cds-button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-lifecycle-switcher': DemoLifecycleSwitcher;
  }
}
