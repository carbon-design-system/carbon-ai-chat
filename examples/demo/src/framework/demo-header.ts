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

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

/**
 * `DemoHeader` is a custom Lit element representing a header component.
 */
@customElement('demo-header')
export class DemoHeader extends LitElement {
  render() {
    return html`
      <cds-header aria-label="Carbon AI Chat">
        <cds-header-name href="https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html" prefix="Carbon"
          >AI Chat</cds-header-name
        >
      </cds-header>
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    'demo-header': DemoHeader;
  }
}
