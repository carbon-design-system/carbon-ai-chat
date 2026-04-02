/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import { CarbonTheme, type PublicConfig } from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { mockOnFileUpload } from "./mockOnFileUpload";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  upload: {
    is_on: true,
    onFileUpload: mockOnFileUpload,
    // Optional: restrict accepted file types (same format as the HTML `accept` attribute).
    // accept: "image/*,.pdf",
    // Optional: reject files larger than 10 MB before calling onFileUpload.
    // maxFileSizeBytes: 10 * 1024 * 1024,
    // Optional: limit the number of files that can be attached at once.
    // maxFiles: 5,
  },
  injectCarbonTheme: CarbonTheme.WHITE,
};

@customElement("my-app")
export class Demo extends LitElement {
  render() {
    return html`
      <cds-aichat-container
        .messaging=${config.messaging}
        .upload=${config.upload}
        .injectCarbonTheme=${config.injectCarbonTheme}
      ></cds-aichat-container>
    `;
  }
}

// Made with Bob
