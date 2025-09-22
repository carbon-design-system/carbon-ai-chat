/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, fixture, expect } from "@open-wc/testing";
import "../src/tile-container.js";
import Tile from "../src/tile-container.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */
describe("aichat tile", function () {
  it("should render cds-aichat-tile-container in DOM", async () => {
    const el = await fixture<Tile>(
      html`<cds-aichat-tile-container> tile </cds-aichat-tile-container>`,
    );

    await expect(el).dom.to.equalSnapshot();
  });
});
