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
  openChatWindow,
  waitForChatReady,
  prepareDemoPage,
  waitForSetChatConfigApplied,
  setupAccessibilityChecker,
  checkAccessibility,
} from "./utils";

// Import types for window.setChatConfig without emitting runtime code
import type {} from "../types/window";

// Setup accessibility checker before all tests
test.beforeAll(() => {
  setupAccessibilityChecker();
});

// Setup common to all tests
test.beforeEach(async ({ page }) => {
  await prepareDemoPage(page, { setChatConfig: true });
});

// Clear session between all tests to ensure clean state
test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

test("homescreen from disabled to enabled", async ({ page }) => {
  // Phase 1: Enable homescreen
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        homescreen: {
          isOn: true,
          greeting: "Homescreen Now Enabled!",
        },
        header: { title: "With Homescreen" },
        openChatByDefault: true,
      });
    }
  });

  await waitForSetChatConfigApplied(page);
  await openChatWindow(page);
  await waitForChatReady(page, {
    panelTestId: PageObjectId.HOME_SCREEN_PANEL,
  });

  // Key verification: homescreen should be visible with the greeting
  await expect(page.getByTestId(PageObjectId.HOME_SCREEN_PANEL)).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText("Homescreen Now Enabled!")).toBeVisible();

  // Run accessibility check on the chat widget
  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, "Homescreen - Enabled State");
});

test("homescreen greeting updates", async ({ page }) => {
  // Phase 1: Set initial homescreen with greeting
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        homescreen: {
          isOn: true,
          greeting: "Initial Greeting",
        },
        header: { title: "Test Chat" },
        openChatByDefault: true,
      });
    }
  });

  await waitForSetChatConfigApplied(page);

  // Phase 2: Update homescreen greeting
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        homescreen: {
          isOn: true,
          greeting: "Updated Greeting Message",
        },
        header: { title: "Test Chat" },
        openChatByDefault: true,
      });
    }
  });

  await waitForSetChatConfigApplied(page);
  await openChatWindow(page);
  await waitForChatReady(page, {
    panelTestId: PageObjectId.HOME_SCREEN_PANEL,
  });

  // Key verification: homescreen should be visible with updated greeting
  await expect(page.getByTestId(PageObjectId.HOME_SCREEN_PANEL)).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText("Updated Greeting Message")).toBeVisible();

  // Run accessibility check on the chat widget
  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, "Homescreen - Updated Greeting");
});
