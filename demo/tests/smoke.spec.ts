/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from "@carbon/ai-chat/server";
import { test, expect } from "@playwright/test";

// Setup common to all tests
test.beforeEach(async ({ page }) => {
  // Block analytics script BEFORE navigation to avoid cookie consent issues
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());

  // Navigate to demo page first to get chatInstance
  await page.goto("/");
});

// Clear session between all tests to ensure clean state
test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    if (window.chatInstance) {
      window.chatInstance.destroySession();
    }
  });
});

test("smoke React", async ({ page }) => {
  // Navigate to the app with float layout settings
  await page.goto("/?settings=%7B%22layout%22%3A%22float%22%7D");

  // Wait for the launcher to be visible
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible({
    timeout: 15000,
  });

  // Open the React chat widget, enter a message, confirm receipt of answer, close the chat.
  await page.getByTestId(PageObjectId.LAUNCHER).click();

  // Wait for the main panel to appear
  const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(mainPanel).toBeVisible();

  // Wait for the close button to appear (chat may need time to initialize)
  const close = mainPanel.getByTestId(PageObjectId.CLOSE_CHAT);
  await expect(close).toBeVisible({ timeout: 10000 });
  await mainPanel.getByTestId(PageObjectId.INPUT).click();
  await mainPanel.getByTestId(PageObjectId.INPUT).fill("text");
  await mainPanel.getByTestId(PageObjectId.INPUT_SEND).click();
  await expect(page.locator("#cds-aichat--message-3")).toContainText("Carbon");
  await close.click();
});

test("smoke web component", async ({ page }) => {
  // Navigate to the app with web component and float layout settings
  await page.goto(
    "/?settings=%7B%22framework%22%3A%22web-component%22%2C%22layout%22%3A%22float%22%7D",
  );

  // Wait for page to fully load and web component to initialize
  await page.waitForLoadState("domcontentloaded");

  // Wait for the chatInstance to be available on window
  await page.waitForFunction(() => Boolean(window.chatInstance), {
    timeout: 10000,
  });

  // Wait for the web component to be ready and launcher to be visible
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible({
    timeout: 15000,
  });

  // Open the Web component chat widget, enter a message, confirm receipt of answer, close the chat.
  await page.getByTestId(PageObjectId.LAUNCHER).click();
  const mainPanelWebComponent = page.getByTestId(PageObjectId.MAIN_PANEL);
  const close = mainPanelWebComponent.getByTestId(PageObjectId.CLOSE_CHAT);
  await expect(close).toBeVisible();
  await mainPanelWebComponent.getByTestId(PageObjectId.INPUT).click();
  await mainPanelWebComponent.getByTestId(PageObjectId.INPUT).fill("text");
  await mainPanelWebComponent.getByTestId(PageObjectId.INPUT_SEND).click();
  await expect(page.locator("#cds-aichat--message-3")).toContainText("Carbon");
  await close.click();
});
