// cspell:words CDSAIChatTileContainer aichat
/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/web-components/es/components/tile/tile.js";
import "@carbon/ai-chat-components/es/components/tile-container/index.js";
import CDSAIChatTileContainer from "@carbon/ai-chat-components/es/components/tile-container/src/tile-container.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */
describe("aichat tile", function () {
  it("should render cds-aichat-tile-container in DOM", async () => {
    const el = await fixture<CDSAIChatTileContainer>(
      html`<cds-aichat-tile-container>
        <cds-tile>tile</cds-tile>
      </cds-aichat-tile-container>`,
    );

    await expect(el).dom.to.equalSnapshot();
  });

  it("should place the light dom styles into the header", async () => {
    await fixture<CDSAIChatTileContainer>(
      html`<cds-aichat-tile-container>
          <cds-tile>tile</cds-tile>
        </cds-aichat-tile-container>
        <cds-aichat-tile-container>
          <cds-tile>tile</cds-tile>
        </cds-aichat-tile-container>`,
    );

    const styleId = "cds-aichat-tile-container-light-dom-styles";
    const style = document.querySelectorAll(
      `style#${styleId}`,
    )[0] as HTMLStyleElement;
    expect(style).to.exist;
    expect(style?.textContent).to.include("cds-tile");

    // ensure the style is not duplicated
    const styles = document.querySelectorAll(`style#${styleId}`);
    expect(styles.length).to.equal(1);
  });
});
