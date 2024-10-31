/**
 * @license
 *
 * Copyright IBM Corp. 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "../extended-button.js";
import ExtendedButton from "../extended-button.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */
describe("extended-button", function () {
  it("should render with cds-button minimum attributes", async () => {
    const el = await fixture<ExtendedButton>(
      html`<prefix-extended-button> button </prefix-extended-button>`
    );

    await expect(el).dom.to.equalSnapshot();
  });
});
