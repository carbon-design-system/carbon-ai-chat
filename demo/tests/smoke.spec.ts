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
import { test, expect, Page } from "@playwright/test";

async function openAccordionIfNeeded(page: Page, title: string) {
  const accordionButton = page.getByRole("button", {
    name: title,
    exact: true,
  });
  await accordionButton.waitFor({ state: "visible" });
  const expanded = await accordionButton.getAttribute("aria-expanded");
  if (expanded !== "true") {
    await accordionButton.click();
  }
}

async function selectLayoutFloat(page: Page) {
  await openAccordionIfNeeded(page, "Choose Chat Component");
  await page.getByRole("combobox", { name: "Layout" }).click();

  await Promise.all([
    page.waitForURL(
      (url) => {
        const parsed = new URL(url.toString());
        const settings = parsed.searchParams.get("settings");
        if (!settings) {
          return false;
        }

        try {
          const parsedSettings = JSON.parse(settings);
          return parsedSettings.layout === "float";
        } catch (error) {
          return false;
        }
      },
      { waitUntil: "load" },
    ),
    page.getByRole("option", { name: "Float" }).click(),
  ]);

  await closeChatIfOpen(page);
}

async function closeChatIfOpen(page: Page) {
  const close = page.getByTestId(
    makeTestId(PageObjectId.CLOSE_CHAT, OverlayPanelName.MAIN),
  );
  if ((await close.count()) > 0 && (await close.isVisible())) {
    await close.click();
    await expect(close).not.toBeVisible();
  }
}

test("smoke React", async ({ page }) => {
  // Block analytics script
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());

  // 1) Navigate to the app
  await page.goto("/");

  // Make sure the demo runs in floating layout (launcher closed by default)
  await selectLayoutFloat(page);

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
  await openAccordionIfNeeded(page, "Choose Chat Component");
  await page.getByRole("combobox", { name: "Component framework" }).click();
  await Promise.all([
    page.waitForURL((url) => url.search.includes("web-component"), {
      waitUntil: "load",
    }),
    page.getByRole("option", { name: "Web component" }).click(),
  ]);

  await closeChatIfOpen(page);

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
