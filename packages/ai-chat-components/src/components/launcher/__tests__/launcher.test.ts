/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect, oneEvent } from "@open-wc/testing";
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

  it("should render an unread count badge when unread messages are present", async () => {
    const el = await fixture<Launcher>(
      html`<cds-aichat-launcher
        closed-label="Open chat"
        open-label="Close chat"
        unread-message-count="3"
        unread-label="3 unread messages"
      ></cds-aichat-launcher>`,
    );

    const badge = el.shadowRoot?.querySelector(".cds-aichat--count-indicator");
    const button = el.shadowRoot?.querySelector("cds-aichat-button");

    expect(badge?.textContent?.trim()).to.equal("3");
    expect(button?.getAttribute("aria-label")).to.equal(
      "Open chat. 3 unread messages",
    );
  });

  it("should render an indicator dot when requested without an unread count", async () => {
    const el = await fixture<Launcher>(
      html`<cds-aichat-launcher
        closed-label="Open chat"
        open-label="Close chat"
        show-unread-indicator
      ></cds-aichat-launcher>`,
    );

    const badge = el.shadowRoot?.querySelector(".cds-aichat--count-indicator");

    expect(badge).to.exist;
    expect(badge?.textContent?.trim()).to.equal("");
  });

  it("should dispatch a toggle event when clicked", async () => {
    const el = await fixture<Launcher>(
      html`<cds-aichat-launcher
        closed-label="Open chat"
        open-label="Close chat"
      ></cds-aichat-launcher>`,
    );

    const button = el.shadowRoot?.querySelector("cds-aichat-button");
    setTimeout(() => button?.click());

    const event = await oneEvent(el, "cds-aichat-launcher-toggle");

    expect(event).to.exist;
  });
});
