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

describe("history panel item overflow menu positioning", () => {
  it("flips the overflow menu body upward when there is not enough space below", async () => {
    const createRect = (rect: Partial<DOMRect>): DOMRect =>
      ({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON: () => rect,
        ...rect,
      }) as DOMRect;

    const host = await fixture(html`
      <cds-aichat-history-content>
        <cds-aichat-history-panel-item
          id="with-menu"
          name="With menu"
        ></cds-aichat-history-panel-item>
      </cds-aichat-history-content>
    `);
    const item = host.querySelector(
      "cds-aichat-history-panel-item",
    ) as HTMLElement & {
      actions: unknown[];
      updateComplete: Promise<boolean>;
      _adjustMenuPosition: () => void;
    };
    item.actions = [{ text: "Delete" }, { text: "Rename" }];
    await item.updateComplete;

    const overflowMenu = item.shadowRoot?.querySelector(
      "cds-overflow-menu",
    ) as HTMLElement;
    const overflowMenuBody = item.shadowRoot?.querySelector(
      "cds-overflow-menu-body",
    ) as HTMLElement;
    const flippedClass = "cds-aichat--history-overflow-menu-body--flipped";

    host.getBoundingClientRect = () => createRect({ top: 0, bottom: 120 });
    overflowMenu.getBoundingClientRect = () =>
      createRect({ top: 80, bottom: 112 });
    overflowMenuBody.getBoundingClientRect = () => createRect({ height: 80 });

    item._adjustMenuPosition();

    expect(overflowMenuBody.classList.contains(flippedClass)).to.be.true;

    host.getBoundingClientRect = () => createRect({ top: 0, bottom: 240 });

    item._adjustMenuPosition();

    expect(overflowMenuBody.classList.contains(flippedClass)).to.be.false;
  });
});
