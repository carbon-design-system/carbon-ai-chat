/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import '@carbon/web-components/es/components/checkbox/index.js';

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import {
  USE_UPSERT_MESSAGE_PARAM,
  usesUpsertMessage,
} from '../customSendMessage/sendResponse';

// The mode lives in the query string, not in `Settings`, so a change reloads
// the page and the conversation starts over in one mode.
@customElement('demo-upsert-message-switcher')
export class DemoUpsertMessageSwitcher extends LitElement {
  checkboxChanged = (event: Event) => {
    const { checked } = (event as CustomEvent).detail;
    const url = new URL(window.location.href);
    if (checked) {
      url.searchParams.set(USE_UPSERT_MESSAGE_PARAM, '');
    } else {
      url.searchParams.delete(USE_UPSERT_MESSAGE_PARAM);
    }
    window.location.assign(url.toString());
  };

  render() {
    return html`<cds-checkbox
      ?checked=${usesUpsertMessage()}
      @cds-checkbox-changed=${this.checkboxChanged}
      helper-text="Sends mock responses through upsertMessage instead of addMessage and addMessageChunk. Reloads the page."
      label-text="Use upsertMessage">
    </cds-checkbox>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-upsert-message-switcher': DemoUpsertMessageSwitcher;
  }
}
