/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import {
  makeTestId,
  OverlayPanelName,
  PageObjectId,
} from "@carbon/ai-chat/server";
import { test, expect } from "@playwright/test";

test("smoke React", async ({ page }) => {
  // Block analytics script
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());

  // 1) Navigate to the app
  await page.goto("/");

  // 2) Open the React chat widget, enter a message, confirm receipt of answer, close the chat.
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  const close = page.getByTestId(
    makeTestId(PageObjectId.CLOSE_CHAT, OverlayPanelName.MAIN),
  );
  await expect(close).toBeVisible();
  await page
    .getByTestId(makeTestId(PageObjectId.INPUT, OverlayPanelName.MAIN))
    .click();
  await page
    .getByTestId(makeTestId(PageObjectId.INPUT, OverlayPanelName.MAIN))
    .fill("text");
  await page
    .getByTestId(makeTestId(PageObjectId.INPUT_SEND, OverlayPanelName.MAIN))
    .click();
  await expect(page.locator("#cds-aichat--message-3")).toContainText(
    "Carbon is a",
  );
  await close.click();
});

test("smoke web component", async ({ page }) => {
  // Block analytics script
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());

  // 1) Navigate to the app
  await page.goto("/");

  // 2) Select “Web component” and wait for the new page (query string) to load
  await page.getByRole("combobox", { name: "Component framework" }).click();
  await Promise.all([
    page.waitForURL((url) => url.search.includes("web-component"), {
      waitUntil: "load",
    }),
    page.getByRole("option", { name: "Web component" }).click(),
  ]);

  // 3) Open the Web component chat widget, enter a message, confirm receipt of answer, close the chat.
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  const close = page.getByTestId(
    makeTestId(PageObjectId.CLOSE_CHAT, OverlayPanelName.MAIN),
  );
  await expect(close).toBeVisible();
  await page
    .getByTestId(makeTestId(PageObjectId.INPUT, OverlayPanelName.MAIN))
    .click();
  await page
    .getByTestId(makeTestId(PageObjectId.INPUT, OverlayPanelName.MAIN))
    .fill("text");
  await page
    .getByTestId(makeTestId(PageObjectId.INPUT_SEND, OverlayPanelName.MAIN))
    .click();
  await expect(page.locator("#cds-aichat--message-3")).toContainText(
    "Carbon is a",
  );
  await close.click();
});
