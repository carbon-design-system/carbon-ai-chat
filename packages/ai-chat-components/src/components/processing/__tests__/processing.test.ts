// cspell:words CDSAIChatProcessing aichat
/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/processing/index.js";
import CDSAIChatProcessing from "@carbon/ai-chat-components/es/components/processing/src/processing.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */
describe("aichat processing", function () {
  it("should render cds-aichat-processing in DOM", async () => {
    const el = await fixture<CDSAIChatProcessing>(
      html`<cds-aichat-processing></cds-aichat-processing>`,
    );

    await el.updateComplete;

    expect(el).to.be.instanceOf(CDSAIChatProcessing);
    expect(el.tagName.toLowerCase()).to.equal("cds-aichat-processing");
    expect(el.shadowRoot?.querySelector(".dots")).to.exist;
  });

  it("should render with loop property", async () => {
    const el = await fixture<CDSAIChatProcessing>(
      html`<cds-aichat-processing loop></cds-aichat-processing>`,
    );

    expect(el.loop).to.be.true;
    const linearClass = el.shadowRoot?.querySelector(".linear");
    expect(linearClass).to.exist;
  });

  it("should render with quickLoad property", async () => {
    const el = await fixture<CDSAIChatProcessing>(
      html`<cds-aichat-processing quick-load></cds-aichat-processing>`,
    );

    expect(el.quickLoad).to.be.true;
    const quickLoadClass = el.shadowRoot?.querySelector(".quick-load");
    expect(quickLoadClass).to.exist;
  });
});
