/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Input code snippet (Web components)
 *
 * Demonstrates: registering a custom Tiptap node on the chat input so typing
 * ``` swaps the current paragraph for an editable
 * `<cds-aichat-code-snippet>`. The closing fence is implicit — it is added
 * at send time when the node's `attrs.value` (a fenced-markdown projection)
 * is serialized into the outgoing message text. On send, the JSON node rides
 * in `display_content` and the message bubble shows a read-only snippet via
 * `renderUserDefinedInputNode`.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` + `.renderUserDefinedInputNode` property
 *   - `PublicConfig.input.tiptap.extensions` (the custom `codeSnippetBlock` node)
 *   - `PublicConfig.layout.showFrame` / `openChatByDefault`
 *
 * Start reading at: the `config` constant, then `render`.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/styles/css/styles.css";
import { type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { codeSnippetNode } from "./codeSnippetNode";
import { customSendMessage } from "./customSendMessage";
import { renderCodeSnippet } from "./renderCodeSnippet";

// Module-scope so the reference is stable across renders — a fresh `input`
// object (or `tiptap.extensions` array) would make the editor recreate.
const config: PublicConfig = {
  messaging: { customSendMessage },
  layout: {
    showFrame: false,
  },
  openChatByDefault: true,
  input: {
    // Register the host-defined `codeSnippetBlock` node.
    tiptap: { extensions: [codeSnippetNode] },
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  render() {
    return html`
      <cds-aichat-custom-element
        class="chat-custom-element"
        .messaging=${config.messaging}
        .input=${config.input}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .renderUserDefinedInputNode=${renderCodeSnippet}
      ></cds-aichat-custom-element>
    `;
  }
}
