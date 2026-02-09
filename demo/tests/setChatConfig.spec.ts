/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from "@carbon/ai-chat/server";
import { test, expect } from "@playwright/test";
import { DemoPageObjectId } from "./utils";
import {
  destroyChatSession,
  openChatWindow,
  waitForChatReady,
  waitForSetChatConfigApplied,
} from "./utils";

// Import types for window.setChatConfig without emitting runtime code
import type {} from "../types/window";

// Clear session between all tests to ensure clean state
test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

// Full happy-path regression for setChatConfig mode to ensure notifications and view transitions still behave.
test("setChatConfig configuration mode functionality", async ({ page }) => {
  // Block analytics script to avoid cookie consent issues
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());

  // Phase 1: Initial Setup & Config Application

  // 1. Navigate to demo page
  await page.goto("/");

  // Clear session storage to ensure clean state
  await page.evaluate(() => {
    if (window.chatInstance) {
      window.chatInstance.destroySession();
    }
  });

  // Wait for page to be ready for interaction
  await page.waitForLoadState("domcontentloaded");

  // 2. Verify normal mode: sidebar visible, no notifications
  await expect(page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR)).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ERROR),
  ).toBeHidden({ timeout: 15000 });

  await page.goto("/?config=setChatConfig");

  await page.evaluate(() => {
    if (window.chatInstance) {
      window.chatInstance.destroySession();
    }
  });

  // Wait for page to be ready for interaction
  await page.waitForLoadState("domcontentloaded");

  // 3. Call window.setChatConfig with header title
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        header: { title: "Test Title 1" },
      });
    }
  });

  await waitForSetChatConfigApplied(page);
  await openChatWindow(page);
  await waitForChatReady(page, { panelTestId: PageObjectId.MAIN_PANEL });

  // 4. Assertions for setChatConfig mode activation - sidebar should still be visible but with different content
  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ERROR),
  ).toBeHidden({ timeout: 15000 });

  // Should show "Leave setChatConfig Mode" button in sidebar
  await expect(
    page.getByTestId(DemoPageObjectId.LEAVE_SET_CHAT_CONFIG_MODE_BUTTON),
  ).toBeVisible();

  // Check if title was updated
  await expect(page.getByTestId(PageObjectId.HEADER_TITLE)).toContainText(
    "Test Title 1",
  );

  // Phase 2: Page Refresh & Error State

  // 5. Refresh the page with a new session to make sure the chat resets its open/close state.
  await page.evaluate(() => {
    if (window.chatInstance) {
      window.chatInstance.destroySession();
    }
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");

  // Verify URL contains setChatConfig parameters
  await expect(page).toHaveURL(/[?&]config=setChatConfig/);

  // 6. Assertions for error state after refresh - should show error notification and no sidebar
  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ERROR),
  ).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR),
  ).not.toBeVisible();

  // Verify chat is not started (no launcher should be visible)
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).not.toBeVisible();
  await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).not.toBeVisible();

  // Phase 3: Recovery & Different Property

  // 7. Call window.setChatConfig with different property (header name)
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        header: { name: "Test Assistant" },
      });
    }
  });

  await openChatWindow(page);
  await waitForChatReady(page, { panelTestId: PageObjectId.MAIN_PANEL });

  // 8. Assertions for recovery - sidebar should be visible again with Leave button

  // Verify the header name is also applied in the main panel
  await expect(page.getByTestId(PageObjectId.HEADER_NAME)).toContainText(
    "Test Assistant",
  );

  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ERROR),
  ).not.toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
  await expect(page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR)).toBeVisible();
});

test("setChatConfig mode without config prevents chat startup", async ({
  page,
}) => {
  // Block analytics script to avoid cookie consent issues
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());

  // Navigate directly to setChatConfig mode URL without calling setChatConfig
  await page.goto("/?config=setChatConfig");
  await page.waitForLoadState("domcontentloaded");

  // Should show error notification
  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ERROR),
  ).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();

  // Sidebar should be hidden
  await expect(
    page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR),
  ).not.toBeVisible();

  // Chat should NOT be started - no launcher visible
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).not.toBeVisible();
  await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).not.toBeVisible();

  // Calling setChatConfig should start the chat
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        header: { title: "Recovery Test" },
      });
    }
  });

  // Wait for configuration to take effect and chat to initialize
  await waitForSetChatConfigApplied(page);
  await openChatWindow(page);
  await waitForChatReady(page);

  // Now chat should be started.
  await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR)).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.LEAVE_SET_CHAT_CONFIG_MODE_BUTTON),
  ).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.SET_CHAT_CONFIG_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
});
