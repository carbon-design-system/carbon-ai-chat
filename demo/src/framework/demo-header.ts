/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

/**
 * `DemoHeader` is a custom Lit element representing a header component.
 */
@customElement("demo-header")
export class DemoHeader extends LitElement {
  render() {
    return html`
      <cds-header aria-label="Carbon AI chat">
        <cds-header-name
          href="https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html"
          prefix="Carbon"
          >AI chat</cds-header-name
        >
      </cds-header>
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-header": DemoHeader;
  }
}
