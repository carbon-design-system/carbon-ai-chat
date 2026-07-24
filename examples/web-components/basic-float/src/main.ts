/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Float (Web components)
 *
 * Demonstrates: mounting `<cds-aichat-container>` with a mock streaming
 * backend. This is the canonical reference for the float / launcher chat
 * shape in Lit.
 *
 * APIs exercised:
 *   - `<cds-aichat-container>` (custom element)
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *
 * Start reading at: the `config` constant and the `Demo` element below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import { type PublicConfig } from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    // route every outbound user turn through a local mock so the example runs
    // with no network dependency. Replace with a real production implementation.
    customSendMessage,
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  render() {
    return html`
      <cds-aichat-container
        .messaging=${config.messaging}
      ></cds-aichat-container>
    `;
  }
}
