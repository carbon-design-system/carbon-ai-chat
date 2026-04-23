/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "../index.js";

describe("history delete focus restore", () => {
  it("delete panel _getFocusDetailForDeletedItem picks next row and selected state", async () => {
    const host = await fixture(html`
      <cds-aichat-history-shell>
        <cds-aichat-history-content>
          <cds-aichat-history-panel>
            <cds-aichat-history-panel-items>
              <cds-aichat-history-panel-menu expanded title="T">
                <cds-aichat-history-panel-item
                  id="a"
                  name="A"
                  selected
                ></cds-aichat-history-panel-item>
                <cds-aichat-history-panel-item
                  id="b"
                  name="B"
                ></cds-aichat-history-panel-item>
              </cds-aichat-history-panel-menu>
            </cds-aichat-history-panel-items>
          </cds-aichat-history-panel>
        </cds-aichat-history-content>
        <cds-aichat-history-delete-panel></cds-aichat-history-delete-panel>
      </cds-aichat-history-shell>
    `);

    const deletePanel = host.querySelector(
      "cds-aichat-history-delete-panel",
    ) as HTMLElement;
    const detail = (deletePanel as any)._getFocusDetailForDeletedItem("a");
    expect(detail.itemId).to.equal("a");
    expect(detail.nextItemId).to.equal("b");
    expect(detail.deletedItemWasSelected).to.be.true;
  });

  it("cds-aichat-history-shell dispatches history-item-selected on next item after delete", async () => {
    const shell = await fixture(html`
      <cds-aichat-history-shell>
        <cds-aichat-history-content>
          <cds-aichat-history-panel>
            <cds-aichat-history-panel-items>
              <cds-aichat-history-panel-menu expanded title="T">
                <cds-aichat-history-panel-item
                  id="first"
                  name="First"
                  selected
                ></cds-aichat-history-panel-item>
                <cds-aichat-history-panel-item
                  id="second"
                  name="Second"
                ></cds-aichat-history-panel-item>
              </cds-aichat-history-panel-menu>
            </cds-aichat-history-panel-items>
          </cds-aichat-history-panel>
        </cds-aichat-history-content>
        <cds-aichat-history-delete-panel
          item-id="first"
        ></cds-aichat-history-delete-panel>
      </cds-aichat-history-shell>
    `);

    const deletePanel = shell.querySelector("cds-aichat-history-delete-panel")!;

    deletePanel.addEventListener("history-delete-confirm", () => {
      shell
        .querySelector(`cds-aichat-history-panel-item[id="first"]`)
        ?.remove();
    });

    let selectedDetail;
    const onSelected = (e: Event) => {
      selectedDetail = (e as CustomEvent).detail;
    };
    shell.addEventListener("history-item-selected", onSelected);

    const dangerBtn = deletePanel.shadowRoot?.querySelector(
      "cds-aichat-button[kind=danger]",
    ) as HTMLElement;
    expect(dangerBtn).to.exist;
    dangerBtn.click();

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(selectedDetail?.itemId).to.equal("second");
    expect(selectedDetail?.itemName).to.equal("Second");

    shell.removeEventListener("history-item-selected", onSelected);
  });
});
