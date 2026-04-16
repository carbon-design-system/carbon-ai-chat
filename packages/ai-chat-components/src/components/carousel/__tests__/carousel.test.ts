/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/carousel/index.js";
import Carousel from "@carbon/ai-chat-components/es/components/carousel/src/carousel.js";
import prefix from "../../../globals/settings";

const blockClass = `${prefix}-carousel`;

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

const template = html`
  <cds-aichat-carousel>
    <div class="carousel-wrapper">
      <div>slide 1</div>
      <div>slide 2</div>
      <div>slide 3</div>
    </div>
  </cds-aichat-carousel>
`;

describe("carousel", function async() {
  it("should render with cds-aichat-carousel minimum attributes", async () => {
    const el = await fixture<Carousel>(template);
    await el.updateComplete;

    // temp solution to account for image load time
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));

    expect(el).to.be.instanceOf(Carousel);

    const root = el.shadowRoot;
    expect(root).to.exist;

    const indicator = root?.querySelector(`.${blockClass}__indicator`);
    expect(indicator?.textContent).to.equal("1 / 3");

    await expect(el).dom.to.equalSnapshot();
  });
});
