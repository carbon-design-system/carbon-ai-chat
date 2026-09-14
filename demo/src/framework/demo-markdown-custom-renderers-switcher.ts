/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import '@carbon/web-components/es/components/dropdown/index.js';

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { Settings } from './types';

@customElement('demo-markdown-custom-renderers-switcher')
export class DemoMarkdownCustomRenderersSwitcher extends LitElement {
  @property({ type: Object })
  accessor settings!: Settings;

  dropdownSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    this.dispatchEvent(
      new CustomEvent('settings-changed', {
        detail: {
          ...this.settings,
          markdownCustomRenderers: customEvent.detail.item.value,
        },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    return html`<cds-dropdown
      value="${this.settings.markdownCustomRenderers ?? 'false'}"
      title-text="Table rendering"
      @cds-dropdown-selected=${this.dropdownSelected}>
      <cds-dropdown-item value="false">Carbon table</cds-dropdown-item>
      <cds-dropdown-item value="true">customRenderers.table</cds-dropdown-item>
    </cds-dropdown>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-markdown-custom-renderers-switcher': DemoMarkdownCustomRenderersSwitcher;
  }
}
