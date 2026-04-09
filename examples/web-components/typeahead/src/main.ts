/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import {
  CarbonTheme,
  type PublicConfig,
  SuggestionType,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { CANNED_SUGGESTIONS } from "./suggestions";

const config: PublicConfig = {
  messaging: { customSendMessage },
  injectCarbonTheme: CarbonTheme.WHITE,
  input: {
    suggestions: [
      {
        type: SuggestionType.AUTOCOMPLETE,
        trigger: "",
        items: async (query: string) => {
          if (!query.trim()) {
            return [];
          }
          return CANNED_SUGGESTIONS.filter((s) =>
            s.label.toLowerCase().includes(query.toLowerCase()),
          );
        },
        debounceMs: 150,
      },
    ],
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  render() {
    return html`
      <cds-aichat-container
        .messaging=${config.messaging}
        .input=${config.input}
        .injectCarbonTheme=${config.injectCarbonTheme}
      ></cds-aichat-container>
    `;
  }
}
