/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId, ViewType } from "@carbon/ai-chat/server";
import { test, expect } from "@playwright/test";
import {
  setupAccessibilityChecker,
  checkAccessibility,
  destroyChatSession,
  openChatViaLauncher,
} from "./utils";

// Setup accessibility checker before all tests
test.beforeAll(() => {
  setupAccessibilityChecker();
});

// Import types for window.setChatConfig without emitting runtime code
import type {} from "../types/window";

// Setup common to all tests
test.beforeEach(async ({ page }) => {
  // Block analytics script BEFORE navigation to avoid cookie consent issues
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());

  // Navigate to demo page first to get chatInstance
  await page.goto("/");

  // Wait for page to fully load and web component to initialize
  await page.waitForLoadState("domcontentloaded");

  // Wait for the chatInstance to be available on window
  await page.waitForFunction(() => Boolean(window.chatInstance), {
    timeout: 10000,
  });

  await page.evaluate(() => {
    if (window.chatInstance) {
      window.chatInstance.changeView("launcher" as ViewType);
    }
  });
});

// Clear session between all tests to ensure clean state
test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

test("smoke React", async ({ page }) => {
  test.slow();
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
  const close = page.getByTestId(PageObjectId.CLOSE_CHAT);
  await expect(close).toBeVisible({ timeout: 10000 });
  await page.getByTestId(PageObjectId.INPUT).click();
  await page.getByTestId(PageObjectId.INPUT).fill("text");
  await page.getByTestId(PageObjectId.INPUT_SEND).click();
  await expect(mainPanel.getByTestId("message-by-index-3")).toContainText(
    "Carbon",
  );

  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, "React Chat - Main Panel");
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
  const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
  const close = page.getByTestId(PageObjectId.CLOSE_CHAT);
  await expect(close).toBeVisible();
  await page.getByTestId(PageObjectId.INPUT).click();
  await page.getByTestId(PageObjectId.INPUT).fill("text");
  await page.getByTestId(PageObjectId.INPUT_SEND).click();
  await expect(mainPanel.getByTestId("message-by-index-3")).toContainText(
    "Carbon",
  );

  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, "Web Component Chat - Main Panel");

  await close.click();
});

test("smoke react custom element", async ({ page }) => {
  test.slow();
  // Navigate to the app with fullscreen layout to render the custom element
  await page.goto("/");

  await page.waitForFunction(() => Boolean(window.chatInstance), {
    timeout: 10000,
  });

  // Click launcher to open chat if it's not already open
  await openChatViaLauncher(page);

  const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(mainPanel).toBeVisible({ timeout: 10000 });

  const input = page.getByTestId(PageObjectId.INPUT);
  await input.click();
  await input.fill("text");
  await page.getByTestId(PageObjectId.INPUT_SEND).click();
  await expect(mainPanel.getByTestId("message-by-index-3")).toContainText(
    "Carbon",
  );
});

test("smoke web component custom element", async ({ page }) => {
  // Navigate to the web component demo using the fullscreen layout (custom element)
  await page.goto(
    `/?settings=%7B"framework"%3A"web-component"%2C"layout"%3A"fullscreen"%2C"writeableElements"%3A"false"%2C"direction"%3A"default"%7D&config=%7B"aiEnabled"%3Atrue%2C"messaging"%3A%7B%7D%2C"header"%3A%7B"isOn"%3Afalse%7D%2C"layout"%3A%7B"showFrame"%3Afalse%7D%2C"launcher"%3A%7B"isOn"%3Atrue%7D%2C"openChatByDefault"%3Atrue%7D`,
  );

  await page.waitForLoadState("domcontentloaded");

  await page.waitForFunction(() => Boolean(window.chatInstance), {
    timeout: 10000,
  });

  // Click launcher to open chat if it's not already open
  await openChatViaLauncher(page);

  const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(mainPanel).toBeVisible({ timeout: 10000 });

  const input = page.getByTestId(PageObjectId.INPUT);
  await input.click();
  await input.fill("text");
  await page.getByTestId(PageObjectId.INPUT_SEND).click();
  await expect(mainPanel.getByTestId("message-by-index-3")).toContainText(
    "Carbon",
  );
});
