/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from "@carbon/ai-chat/server";
import { test, expect } from "@playwright/test";
import {
  destroyChatSession,
  openChatViaLauncher,
  sendChatMessage,
} from "./utils";

// Import types for window.chatInstance without emitting runtime code
import type {} from "../types/window";

// Setup common to all tests
test.beforeEach(async ({ page }) => {
  // Block analytics script BEFORE navigation to avoid cookie consent issues
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
});

// Clear session between all tests to ensure clean state
test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

test.describe("user_defined responses - callback path (web component)", () => {
  test("renders a user_defined response via renderUserDefinedResponse callback", async ({
    page,
  }) => {
    test.slow();

    // Navigate to the web component demo with float layout
    await page.goto(
      "/?settings=%7B%22framework%22%3A%22web-component%22%2C%22layout%22%3A%22float%22%7D",
    );

    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => Boolean(window.chatInstance), {
      timeout: 10000,
    });

    // Open the chat
    await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId(PageObjectId.LAUNCHER).click();
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();

    // Send a message that triggers a user_defined response
    await sendChatMessage(page, "user_defined");

    // Wait for the user-defined-response-example element to appear in the DOM
    // The callback creates this element and the library manages slotting it in
    await expect(
      page.locator("user-defined-response-example").first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("renders a streaming user_defined response via callback", async ({
    page,
  }) => {
    test.slow();

    await page.goto(
      "/?settings=%7B%22framework%22%3A%22web-component%22%2C%22layout%22%3A%22float%22%7D",
    );

    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => Boolean(window.chatInstance), {
      timeout: 10000,
    });

    await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId(PageObjectId.LAUNCHER).click();
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();

    // Send a streaming user_defined message
    await sendChatMessage(page, "user_defined (stream)");

    // Wait for the user-defined-response-example element to appear
    // During streaming, the callback should be invoked with partialItems
    await expect(
      page.locator("user-defined-response-example").first(),
    ).toBeVisible({ timeout: 30000 });
  });

  test("renders user_defined response in fullscreen custom element layout", async ({
    page,
  }) => {
    test.slow();

    await page.goto(
      `/?settings=%7B"framework"%3A"web-component"%2C"layout"%3A"fullscreen"%2C"writeableElements"%3A"false"%7D&config=%7B"aiEnabled"%3Atrue%2C"messaging"%3A%7B%7D%2C"header"%3A%7B"isOn"%3Afalse%7D%2C"layout"%3A%7B"showFrame"%3Afalse%7D%2C"launcher"%3A%7B"isOn"%3Atrue%7D%2C"openChatByDefault"%3Atrue%7D`,
    );

    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => Boolean(window.chatInstance), {
      timeout: 10000,
    });

    await openChatViaLauncher(page);
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible({
      timeout: 10000,
    });

    await sendChatMessage(page, "user_defined");

    await expect(
      page.locator("user-defined-response-example").first(),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("user_defined responses - legacy event path (React)", () => {
  test("renders a user_defined response via React renderUserDefinedResponse", async ({
    page,
  }) => {
    test.slow();

    // Navigate to the React demo (default framework) with float layout
    await page.goto("/?settings=%7B%22layout%22%3A%22float%22%7D");

    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => Boolean(window.chatInstance), {
      timeout: 10000,
    });

    await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId(PageObjectId.LAUNCHER).click();
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();

    await sendChatMessage(page, "user_defined");

    // React renders user-defined responses using the renderUserDefinedResponse callback
    // The demo's React app renders a green div with the user_defined text
    // React renders a div with class "external" (green background) for user_defined responses
    await expect(page.locator(".external").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("renders a streaming user_defined response via React", async ({
    page,
  }) => {
    test.slow();

    await page.goto("/?settings=%7B%22layout%22%3A%22float%22%7D");

    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => Boolean(window.chatInstance), {
      timeout: 10000,
    });

    await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId(PageObjectId.LAUNCHER).click();
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();

    await sendChatMessage(page, "user_defined (stream)");

    await expect(page.locator(".external").first()).toBeVisible({
      timeout: 30000,
    });
  });
});
