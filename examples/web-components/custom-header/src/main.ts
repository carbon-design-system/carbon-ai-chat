/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom header (Web components)
 *
 * Demonstrates: replacing the built-in chat header by writing a DOM element to
 * the `CUSTOM_HEADER` writeable-element host node in `onBeforeRender`. Because
 * `onBeforeRender` runs before the React tree is painted, the custom header
 * appears on first render — no flash.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` (custom element)
 *   - `WriteableElementName.CUSTOM_HEADER`
 *   - `onBeforeRender` callback + `instance.writeableElements`
 *   - `PublicConfig.layout.showFrame`, `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *
 * Start reading at: the `onBeforeRender` handler in `Demo.render()`.
 */

import '@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js';

import {
  type ChatInstance,
  type PublicConfig,
  WriteableElementName,
} from '@carbon/ai-chat';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import { customSendMessage } from './customSendMessage';

const config: PublicConfig = {
  messaging: {
    // route outbound messages through a client-side mock so this example runs
    // without a back end; see `./customSendMessage.ts`.
    customSendMessage,
  },
  layout: {
    // hide the default rounded chat frame so the chat fills the host element
    // edge-to-edge — required for the fullscreen baseline pattern.
    showFrame: false,
  },
  // skip the launcher/closed state — open from first paint.
  openChatByDefault: true,
};

@customElement('my-app')
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  // Called before the React tree first renders; write to writeableElements here
  // so the custom header is present on the very first paint — no flash.
  private onBeforeRender = (instance: ChatInstance) => {
    const node = instance.writeableElements[WriteableElementName.CUSTOM_HEADER];

    // Build a simple header bar
    const header = document.createElement('div');
    header.setAttribute('aria-label', 'Custom chat header');
    header.style.cssText = [
      'display:flex',
      'align-items:center',
      'padding:0 1rem',
      'height:3rem',
      'background:#0f62fe',
      'color:#fff',
    ].join(';');

    const title = document.createElement('span');
    title.style.cssText = 'font-weight:600;font-size:0.875rem';
    title.textContent = 'Custom Header';

    header.appendChild(title);
    node!.appendChild(header);
  };

  render() {
    return html`
      <cds-aichat-custom-element
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .onBeforeRender=${this.onBeforeRender}
        class="chat-custom-element"></cds-aichat-custom-element>
    `;
  }
}
