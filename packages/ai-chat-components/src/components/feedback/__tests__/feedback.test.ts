/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect, elementUpdated } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/feedback/index.js";
import Feedback from "@carbon/ai-chat-components/es/components/feedback/src/feedback.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

describe("feedback", function () {
  it("should render", async () => {
    const el = await fixture<Feedback>(
      html`<cds-aichat-feedback></cds-aichat-feedback>`,
    );
    expect(el).to.be.instanceOf(Feedback);
    expect(el.shadowRoot).to.exist;
  });

  it("respects max-length attribute", async () => {
    const el = await fixture<Feedback>(
      html`<cds-aichat-feedback show-text-area></cds-aichat-feedback>`,
    );

    const textarea = el.shadowRoot!.querySelector("cds-textarea");
    expect(textarea).to.exist;
    expect(textarea?.getAttribute("max-count")).to.not.exist;

    el.maxLength = 500;
    await elementUpdated(el);
    expect(textarea?.getAttribute("max-count")).to.equal("500");
  });

  it("matches snapshot", async () => {
    const el = await fixture<Feedback>(
      html`<cds-aichat-feedback></cds-aichat-feedback>`,
    );
    await expect(el).dom.to.equalSnapshot();
  });

  it("should include selected categories in submit event", async () => {
    const categories = ["Inaccurate", "Unhelpful", "Not relevant"];
    let submittedCategories: string[] | undefined;

    const el = await fixture<Feedback>(
      html`<cds-aichat-feedback
        is-open
        show-text-area
        .categories=${categories}
        @feedback-submit=${(event: CustomEvent) => {
          submittedCategories = event.detail.selectedCategories;
        }}
      ></cds-aichat-feedback>`,
    );

    // Find and click the first category tag
    const firstTag = el.shadowRoot!.querySelector(
      "cds-selectable-tag",
    ) as HTMLElement;
    expect(firstTag).to.exist;
    expect(firstTag.getAttribute("data-content")).to.equal("Inaccurate");

    firstTag.click();
    await elementUpdated(el);

    // Find and click the third category tag
    const tags = el.shadowRoot!.querySelectorAll("cds-selectable-tag");
    const thirdTag = tags[2] as HTMLElement;
    expect(thirdTag).to.exist;
    expect(thirdTag.getAttribute("data-content")).to.equal("Not relevant");

    thirdTag.click();
    await elementUpdated(el);

    // Click submit button
    const submitButton = el.shadowRoot!.querySelector("cds-button");
    expect(submitButton).to.exist;
    (submitButton as HTMLElement).click();
    await elementUpdated(el);

    // Verify the submitted categories
    expect(submittedCategories).to.exist;
    expect(submittedCategories).to.have.lengthOf(2);
    expect(submittedCategories).to.include("Inaccurate");
    expect(submittedCategories).to.include("Not relevant");
  });
});
