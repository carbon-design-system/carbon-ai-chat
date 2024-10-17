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

import '@carbon/web-components/es/components/ui-shell/index.js';
import '@carbon/web-components/es/components/layer/index.js';
import '@carbon/web-components/es/components/icon-button/index.js';
import './framework/demo-version-switcher';
import './framework/demo-layout-switcher';
import './framework/demo-theme-switcher';
import '@carbon/ai-chat/dist/web-components/cds-aichat-container/index.js';
import '@carbon/ai-chat/dist/web-components/cds-aichat-custom-element/index.js';

import {
  BusEventViewChange,
  ChatInstance,
  CornersType,
  MinimizeButtonIconType,
  PublicConfig,
  ViewType,
} from '@carbon/ai-chat';
import rightPanelOpen from '@carbon/web-components/es/icons/right-panel--open/16.js';
import { KeyPairs, Settings } from 'framework/types';
import { css, html, LitElement, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import React from 'react';
import { DemoApp } from 'react/DemoApp';
import { createRoot, Root } from 'react-dom/client';

import { customSendMessage } from './customSendMessage';

const urlParams = new URLSearchParams(window.location.search);
const settings: Partial<Settings> = urlParams.has('settings') ? JSON.parse(urlParams.get('settings')) : {};
const config: Partial<PublicConfig> = urlParams.has('config') ? JSON.parse(urlParams.get('config')) : {};

let defaultConfig: PublicConfig = {
  ...config,
  messaging: {
    customSendMessage,
    ...config.messaging,
  },
};

const defaultSettings: Settings = {
  framework: 'react',
  layout: 'float',
  homescreen: 'none',
  ...settings,
};

// eslint-disable-next-line default-case
switch (defaultSettings.layout) {
  case 'float':
    defaultConfig = {
      ...defaultConfig,
      headerConfig: { ...defaultConfig.headerConfig, hideMinimizeButton: undefined },
      themeConfig: { ...defaultConfig.themeConfig, corners: undefined },
      layout: { ...defaultConfig.layout, showFrame: undefined },
      element: undefined,
      openChatByDefault: undefined,
    };
    break;
  case 'sidebar':
    defaultConfig = {
      ...defaultConfig,
      headerConfig: {
        ...defaultConfig.headerConfig,
        hideMinimizeButton: undefined,
        minimizeButtonIconType: MinimizeButtonIconType.SIDE_PANEL_RIGHT,
      },
      themeConfig: { ...defaultConfig.themeConfig, corners: CornersType.SQUARE },
      layout: { ...defaultConfig.layout, showFrame: undefined },
      openChatByDefault: undefined,
    };
    break;
  case 'fullscreen':
    defaultConfig = {
      ...defaultConfig,
      headerConfig: { ...defaultConfig.headerConfig, hideMinimizeButton: true },
      themeConfig: { ...defaultConfig.themeConfig, corners: CornersType.SQUARE },
      layout: { ...defaultConfig.layout, showFrame: false },
      openChatByDefault: true,
    };
    break;
}

function updateQueryParams(items: KeyPairs[]) {
  // Get the current URL's search params
  const urlParams = new URLSearchParams(window.location.search);

  // Set or update the query parameter
  items.forEach(({ key, value }) => {
    urlParams.set(key, value);
  });
  // Update the URL without refreshing the page
  window.location.search = urlParams.toString();
}

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
    const config = {
      ...this.config,
    };
    delete config.messaging.customSendMessage;
    updateQueryParams([
      { key: 'settings', value: JSON.stringify(settings) },
      { key: 'config', value: JSON.stringify(config) },
    ]);
  }

  private _onConfigChanged(event: CustomEvent) {
    const settings = { ...this.settings };
    const config = event.detail;
    delete config.messaging.customSendMessage;
    updateQueryParams([
      { key: 'settings', value: JSON.stringify(settings) },
      { key: 'config', value: JSON.stringify(config) },
    ]);
  }

  render() {
    return html`<slot name="demo-header"></slot> <slot name="demo-body"></slot>`;
  }
}

/**
 * `DemoHeader` is a custom Lit element representing a header component.
 */
@customElement('demo-header')
export class DemoHeader extends LitElement {
  render() {
    return html`
      <cds-header aria-label="Carbon AI Chat">
        <cds-header-name href="javascript:void 0" prefix="Carbon">AI Chat</cds-header-name>
      </cds-header>
    `;
  }
}

/**
 * `DemoHeader` is a custom Lit element representing a header component.
 */
@customElement('demo-body')
export class DemoBody extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: calc(100vh - 48px);
      width: 100%;
      margin-top: 48px;
      background: var(--cds-layer);
    }

    .page {
      display: flex;
      gap: 1rem;
    }

    .nav-block {
      flex-basis: 320px;
      padding: 0 1rem;
    }

    .main {
      flex-grow: 1;
    }

    .sidebar-nav {
      border-left: 1px solid #e0e0e0;
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
      width: 40px;
      z-index: 9998;
    }

    .fullScreen {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: calc(100vw - 320px - 2rem);
      z-index: 9999;
    }

    .sidebar {
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
      width: 320px;
      z-index: 9999;
      transition:
        right 100ms,
        visibility 0s 100ms; /* Delay visibility change */
      visibility: visible; /* Visible by default */
    }

    .sidebar--closed {
      right: -320px;
      transition:
        right 100ms,
        visibility 0s 0s; /* Immediately hide after transition */
      visibility: hidden; /* Hidden after right transition */
    }

    demo-version-switcher,
    demo-layout-switcher,
    demo-theme-switcher,
    demo-homescreen-switcher {
      display: block;
    }

    demo-layout-switcher,
    demo-theme-switcher,
    demo-homescreen-switcher {
      padding-top: 1rem;
    }
  `;

  @state()
  settings: Settings = defaultSettings;

  @state()
  config: PublicConfig = defaultConfig;

  @state()
  sideBarOpen: boolean;

  @state()
  _instance: ChatInstance;

  onViewChange = (event: BusEventViewChange, instance: ChatInstance) => {
    if (event.newViewState.mainWindow) {
      this.sideBarOpen = true;
    } else {
      this.sideBarOpen = false;
    }
  };

  protected firstUpdated(_changedProperties: PropertyValues): void {
    if (this.settings.framework === 'react') {
      this._renderReactApp();
    }
  }

  onBeforeRender = (instance: ChatInstance) => {
    this._instance = instance;
  };

  openSideBar = () => {
    this._instance?.changeView(ViewType.MAIN_WINDOW);
  };

  /**
   * Track if a previous React 18 root was already created so we don't create a memory leak on re-renders.
   */
  _root: Root;

  private _renderReactApp() {
    const container: HTMLElement = document.querySelector('#root');
    // If a root already exists, unmount it to avoid memory leaks
    if (this._root) {
      this._root.unmount();
    }
    this._root = createRoot(container);
    this._root.render(<DemoApp config={this.config} settings={this.settings} onBeforeRender={this.onBeforeRender} />);
  }

  // Define the element's render template
  render() {
    return html` <div class="page">
      <div class="nav-block">
        <cds-layer>
          <demo-version-switcher .settings=${this.settings}></demo-version-switcher>
          <demo-layout-switcher .settings=${this.settings}></demo-layout-switcher>
          <demo-theme-switcher .config=${this.config}></demo-theme-switcher>
          <!-- <demo-homescreen-switcher .settings=${this.settings}></demo-homescreen-switcher> -->
        </cds-layer>
      </div>
      <div class="main">
        ${this.settings.framework === 'web-component' && this.settings.layout === 'float'
          ? html`<cds-aichat-container
              .config=${this.config}
              .onBeforeRender=${this.onBeforeRender}
            ></cds-aichat-container>`
          : html``}
        ${this.settings.framework === 'web-component' && this.settings.layout === 'sidebar'
          ? html`<cds-aichat-custom-element
              class="sidebar${this.sideBarOpen ? '' : ' sidebar--closed'}"
              .config=${this.config}
              .onBeforeRender=${this.onBeforeRender}
              .onViewChange=${this.onViewChange}
            ></cds-aichat-custom-element>`
          : html``}
        ${this.settings.framework === 'web-component' && this.settings.layout === 'fullscreen'
          ? html`<cds-aichat-custom-element
              class="fullScreen"
              .config=${this.config}
              .onBeforeRender=${this.onBeforeRender}
            ></cds-aichat-custom-element>`
          : html``}
        <slot></slot>
      </div>
      ${this.settings.layout === 'sidebar' && !this.sideBarOpen
        ? html`<div class="sidebar-nav">
          <cds-icon-button kind="ghost" @click="${this.openSideBar}">
            ${rightPanelOpen({ slot: 'icon' })}
          </cds-icon-bottom>
        </div>`
        : ''}
    </div>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    'demo-container': Demo;
    'demo-header': DemoHeader;
    'demo-body': DemoBody;
  }
}
