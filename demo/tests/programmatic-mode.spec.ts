/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from "@carbon/ai-chat/server";
import { test, expect } from "@playwright/test";
import { DemoPageObjectId } from "./DemoPageObjectId";

// Import types for window.setChatConfig without emitting runtime code
import type {} from "../types/window";

test("programmatic configuration mode functionality", async ({ page }) => {
  // Phase 1: Initial Setup & Config Application

  // 1. Navigate to demo page
  await page.goto("/");

  // 2. Verify normal mode: sidebar visible, no notifications
  await expect(page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR)).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ERROR),
  ).not.toBeVisible();

  // 3. Call window.setChatConfig with header title
  await page.evaluate(() => {
    window.setChatConfig({
      header: { title: "Test Title 1" },
    });
  });

  // 4. Assertions for programmatic mode activation - sidebar should still be visible but with different content
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ERROR),
  ).not.toBeVisible();
  await expect(page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR)).toBeVisible();

  // Should show "Leave Programmatic Mode" button in sidebar
  await expect(
    page.getByTestId(DemoPageObjectId.LEAVE_PROGRAMMATIC_MODE_BUTTON),
  ).toBeVisible();

  // Check that header title is applied
  await expect(page.getByTestId(PageObjectId.HEADER_TITLE)).toContainText(
    "Test Title 1",
  );

  // Verify URL contains programmatic parameters
  await expect(page).toHaveURL(/[?&]settings=programatic/);
  await expect(page).toHaveURL(/[?&]config=programatic/);

  // Phase 2: Page Refresh & Error State

  // 5. Refresh the page
  await page.reload();
  await page.waitForLoadState("networkidle");

  // 6. Assertions for error state after refresh - should show error notification and no sidebar
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ERROR),
  ).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR),
  ).not.toBeVisible();

  // Verify header title reverted to default (NOT "Test Title 1")
  const headerTitleElement = page.getByTestId(PageObjectId.HEADER_TITLE);
  if ((await headerTitleElement.count()) > 0) {
    await expect(headerTitleElement).not.toContainText("Test Title 1");
  }

  // Verify URL still contains programmatic parameters
  await expect(page).toHaveURL(/[?&]settings=programatic/);
  await expect(page).toHaveURL(/[?&]config=programatic/);

  // Verify chat is not started (no launcher should be visible)
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).not.toBeVisible();

  // Phase 3: Recovery & Different Property

  // 7. Call window.setChatConfig with different property (header name)
  await page.evaluate(() => {
    window.setChatConfig({
      header: { name: "Test Assistant" },
    });
  });

  // 8. Assertions for recovery - sidebar should be visible again with Leave button
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ERROR),
  ).not.toBeVisible();
  await expect(page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR)).toBeVisible();

  // Should show "Leave Programmatic Mode" button in sidebar
  await expect(
    page.getByTestId(DemoPageObjectId.LEAVE_PROGRAMMATIC_MODE_BUTTON),
  ).toBeVisible();

  // Check that header name is applied
  await expect(page.getByTestId(PageObjectId.HEADER_NAME)).toContainText(
    "Test Assistant",
  );

  // Verify header title is default (confirms first config was lost)
  const headerTitleAfterRecovery = page.getByTestId(PageObjectId.HEADER_TITLE);
  if ((await headerTitleAfterRecovery.count()) > 0) {
    await expect(headerTitleAfterRecovery).not.toContainText("Test Title 1");
  }

  // Verify chat is now started (launcher should be visible)
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible();
});

test("programmatic mode without config prevents chat startup", async ({
  page,
}) => {
  // Navigate directly to programmatic mode URL without calling setChatConfig
  await page.goto("/?settings=programatic&config=programatic");
  await page.waitForLoadState("networkidle");

  // Should show error notification
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ERROR),
  ).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();

  // Sidebar should be hidden
  await expect(
    page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR),
  ).not.toBeVisible();

  // Chat should NOT be started - no launcher visible
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).not.toBeVisible();

  // Calling setChatConfig should start the chat
  await page.evaluate(() => {
    window.setChatConfig({
      header: { title: "Recovery Test" },
    });
  });

  // Now launcher should be visible and sidebar should show with Leave button
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible();
  await expect(page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR)).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.LEAVE_PROGRAMMATIC_MODE_BUTTON),
  ).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
});
