/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import Toolbar, {
  Action,
} from "@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js";
import {
  Version16,
  Download16,
  Share16,
  Launch16,
  Maximize16,
  Close16,
} from "@carbon/icons";

const actionLists: Record<string, Action[]> = {
  "Advanced list": [
    { text: "Version", icon: Version16, size: "md", onClick: () => {} },
    { text: "Download", icon: Download16, size: "md", onClick: () => {} },
    { text: "Share", icon: Share16, size: "md", onClick: () => {} },
    { text: "Launch", icon: Launch16, size: "md", onClick: () => {} },
    { text: "Maximize", icon: Maximize16, size: "md", onClick: () => {} },
    {
      text: "Close",
      fixed: true,
      icon: Close16,
      size: "md",
      onClick: () => {},
    },
  ],
};

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
