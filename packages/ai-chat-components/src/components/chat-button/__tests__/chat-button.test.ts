/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/chat-button/index.js";
import ChatButton from "@carbon/ai-chat-components/es/components/chat-button/src/chat-button.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

// scope for testing: test only cds-aichat-button specific functionality, no need to test cds-button functionality.
describe("chat-button", function () {
  it("should render with cds-aichat-button minimum attributes", async () => {
    const el = await fixture<ChatButton>(
      html`<cds-aichat-button> button </cds-aichat-button>`,
    );

    await expect(el).dom.to.equalSnapshot();
  });
});
