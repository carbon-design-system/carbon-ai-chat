/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from "@carbon/ai-chat/server";
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

// Setup common to all tests
test.beforeEach(async ({ page }) => {
  // Block analytics script BEFORE navigation to avoid cookie consent issues
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());

  // Navigate to demo page first to get chatInstance
  await page.goto("/");
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
  const close = mainPanel.getByTestId(PageObjectId.CLOSE_CHAT);
  await expect(close).toBeVisible({ timeout: 10000 });
  await mainPanel.getByTestId(PageObjectId.INPUT).click();
  await mainPanel.getByTestId(PageObjectId.INPUT).fill("text");
  await mainPanel.getByTestId(PageObjectId.INPUT_SEND).click();
  await expect(page.locator("#cds-aichat--message-3")).toContainText(
    "Carbon is a",
  );

  // Run accessibility check on the chat widget only
  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, "React Chat - Main Panel");

  /*

  Disabled until we get a11y checker going after the @carbon/components fixes happen.

  await clearConversation(page);

  // Test all non-streaming message types
  // Streaming responses are excluded as they require different handling
   const responseKeys = Object.keys(RESPONSE_MAP).filter(
    (key) => !key.includes("(stream)"),
  );
  for (const responseKey of responseKeys) {
    await sendChatMessage(page, responseKey);
    await checkAccessibility(chatWidget, `React Chat - ${responseKey}`);
    await clearConversation(page);
  } */

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
  await expect(page.locator("#cds-aichat--message-3")).toContainText(
    "Carbon is a",
  );

  // Run accessibility check on the chat widget only
  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, "Web Component Chat - Main Panel");

  await close.click();
});

test("smoke react custom element", async ({ page }) => {
  test.slow();
  // Navigate to the app with fullscreen layout to render the custom element
  await page.goto(
    "/?settings=%7B%22framework%22%3A%22react%22%2C%22layout%22%3A%22fullscreen%22%2C%22writeableElements%22%3A%22false%22%2C%22direction%22%3A%22default%22%7D&config=%7B%22aiEnabled%22%3Atrue%2C%22messaging%22%3A%7B%7D%2C%22header%22%3A%7B%7D%2C%22layout%22%3A%7B%7D%7D",
  );

  await page.waitForFunction(() => Boolean(window.chatInstance), {
    timeout: 10000,
  });

  // Click launcher to open chat if it's not already open
  await openChatViaLauncher(page);

  const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(mainPanel).toBeVisible({ timeout: 10000 });

  const close = mainPanel.getByTestId(PageObjectId.CLOSE_CHAT);
  await expect(close).toBeVisible();

  const input = mainPanel.getByTestId(PageObjectId.INPUT);
  await input.click();
  await input.fill("text");
  await mainPanel.getByTestId(PageObjectId.INPUT_SEND).click();
  await expect(page.locator("#cds-aichat--message-3")).toContainText(
    "Carbon is a",
  );

  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(
    chatWidget,
    "React Custom Element Chat - Fullscreen",
  );

  await close.click();
});

test("smoke web component custom element", async ({ page }) => {
  // Navigate to the web component demo using the fullscreen layout (custom element)
  await page.goto(
    "/?settings=%7B%22framework%22%3A%22web-component%22%2C%22layout%22%3A%22fullscreen%22%2C%22writeableElements%22%3A%22false%22%2C%22direction%22%3A%22default%22%7D&config=%7B%22aiEnabled%22%3Atrue%2C%22messaging%22%3A%7B%7D%2C%22header%22%3A%7B%7D%2C%22layout%22%3A%7B%7D%7D",
  );

  await page.waitForLoadState("domcontentloaded");

  await page.waitForFunction(() => Boolean(window.chatInstance), {
    timeout: 10000,
  });

  // Click launcher to open chat if it's not already open
  await openChatViaLauncher(page);

  const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(mainPanel).toBeVisible({ timeout: 10000 });

  const close = mainPanel.getByTestId(PageObjectId.CLOSE_CHAT);
  await expect(close).toBeVisible();

  const input = mainPanel.getByTestId(PageObjectId.INPUT);
  await input.click();
  await input.fill("text");
  await mainPanel.getByTestId(PageObjectId.INPUT_SEND).click();
  await expect(page.locator("#cds-aichat--message-3")).toContainText(
    "Carbon is a",
  );

  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(
    chatWidget,
    "Web Component Custom Element Chat - Fullscreen",
  );

  await close.click();
});
