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

import './styles.css';
import '@carbon/web-components/es/components/ui-shell/index.js';
import '@carbon/web-components/es/components/layer/index.js';
import '@carbon/web-components/es/components/icon-button/index.js';
import './framework/demo-body';
import './framework/demo-header';
import './framework/demo-version-switcher';
import './framework/demo-layout-switcher';
import './framework/demo-theme-switcher';
import '@carbon/ai-chat/dist/web-components/cds-aichat-container/index.js';
import '@carbon/ai-chat/dist/web-components/cds-aichat-custom-element/index.js';

import { PublicConfig } from '@carbon/ai-chat';
import { Settings } from './framework/types';
import { getSettings, updateQueryParams } from './framework/utils';
import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';

const { defaultConfig, defaultSettings } = getSettings();

@customElement('demo-container')
export class Demo extends LitElement {
  @state()
  settings: Settings = defaultSettings;

  @state()
  config: PublicConfig = defaultConfig;

  firstUpdated() {
    this.addEventListener('config-changed', this._onConfigChanged);
    this.addEventListener('settings-changed', this._onSettingsChanged);
  }

  private _onSettingsChanged(event: CustomEvent) {
    const settings = event.detail;
    const config: PublicConfig = {
      ...this.config,
    };
    delete config.messaging.customSendMessage;
    delete config.element;
    updateQueryParams([
      { key: 'settings', value: JSON.stringify(settings) },
      { key: 'config', value: JSON.stringify(config) },
    ]);
  }

  private _onConfigChanged(event: CustomEvent) {
    const settings = { ...this.settings };
    const config: PublicConfig = event.detail;
    delete config.messaging.customSendMessage;
    delete config.element;
    updateQueryParams([
      { key: 'settings', value: JSON.stringify(settings) },
      { key: 'config', value: JSON.stringify(config) },
    ]);
  }

  render() {
    return html`<slot name="demo-header"></slot> <slot name="demo-body"></slot>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    'demo-container': Demo;
  }
}
