/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import '@carbon/web-components/es/components/dropdown/index.js';

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { Settings } from './types';

@customElement('demo-version-switcher')
export class DemoVersionSwitcher extends LitElement {
  @property({ type: Object })
  settings: Settings;

  firstUpdated() {
    // Listen for the `cds-dropdown-selected` event to handle changes in the dropdown
    this.shadowRoot?.querySelector('cds-dropdown')?.addEventListener('cds-dropdown-selected', (event: CustomEvent) => {
      // Emit a custom event `settings-changed` with the new framework value
      this.dispatchEvent(
        new CustomEvent('settings-changed', {
          detail: { ...this.settings, framework: event.detail.item.value },
          bubbles: true, // Ensure the event bubbles up to `demo-container`
          composed: true, // Allows event to pass through shadow DOM boundaries
        }),
      );
    });
  }

  render() {
    return html`<cds-dropdown value="${this.settings.framework}" title-text="Component framework">
      <cds-dropdown-item value="react">React</cds-dropdown-item>
      <cds-dropdown-item value="web-component">Web component</cds-dropdown-item>
    </cds-dropdown>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    'demo-version-switcher': DemoVersionSwitcher;
  }
}
