/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import Toolbar, {
  Action,
} from "@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js";
import { actionLists } from "../__stories__/story-data";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

describe("toolbar", function () {
  it("should render with cds-aichat-toolbar minimum attributes", async () => {
    const el = await fixture<Toolbar>(
      html`<cds-aichat-toolbar
        .actions=${actionLists["Advanced list"] as Action[]}
      ></cds-aichat-toolbar>`,
    );
    expect(el).to.be.instanceOf(Toolbar);
    expect(el.actions).to.deep.equal(actionLists["Advanced list"] as Action[]);
    expect(el.shadowRoot).to.exist;
    await expect(el).dom.to.equalSnapshot();
  });
});
