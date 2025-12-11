/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/card/index.js";
import Card from "@carbon/ai-chat-components/es/components/card/src/card.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

const cardContent = html`
  <div slot="body">
    <h4>AI Chat Card</h4>
    <p>
      The Carbon Design System provides a comprehensive library of components,
      tokens, and guidelines. We need to implement the new AI Chat component
      following Carbon's design principles and accessibility standards.
    </p>
  </div>
`;

describe("card", function () {
  it("should render with cds-aichat-card minimum attributes", async () => {
    const el = await fixture<Card>(
      html`<cds-aichat-card> ${cardContent} </cds-aichat-card>`,
    );
    expect(el).to.be.instanceOf(Card);
    expect(el.shadowRoot).to.exist;
    expect(el.isLayered).to.be.false;
    expect(el.isFlush).to.be.true;

    await expect(el).dom.to.equalSnapshot();
  });
});
