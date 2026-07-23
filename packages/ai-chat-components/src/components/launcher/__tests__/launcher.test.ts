/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/launcher/index.js";
import Launcher from "@carbon/ai-chat-components/es/components/launcher/src/launcher.js";

describe("launcher", function () {
  it("should render with minimum attributes", async () => {
    const el = await fixture<Launcher>(
      html`<cds-aichat-launcher
        closed-label="Open chat"
        open-label="Close chat"
      ></cds-aichat-launcher>`,
    );

    await expect(el).dom.to.equalSnapshot();
  });
});
