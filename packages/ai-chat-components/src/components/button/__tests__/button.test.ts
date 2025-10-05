/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/button/button.js";
import ChatButton from "@carbon/ai-chat-components/es/components/button/button.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */
describe("button", function () {
  it("should render with cds-button minimum attributes", async () => {
    const el = await fixture<ChatButton>(
      html`<cds-aichat-button> button </cds-aichat-button>`,
    );

    await expect(el).dom.to.equalSnapshot();
  });
});
