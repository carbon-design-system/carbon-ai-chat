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
    if (window.setChatConfig) {
      window.setChatConfig({
        header: { title: "Test Title 1" },
      });
    }
  });

  // 4. Assertions for programmatic mode activation - sidebar should still be visible but with different content
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ERROR),
  ).not.toBeVisible();

  // Should show "Leave Programmatic Mode" button in sidebar
  await expect(
    page.getByTestId(DemoPageObjectId.LEAVE_PROGRAMMATIC_MODE_BUTTON),
  ).toBeVisible();

  // Check that header title is applied using panel-scoped approach
  const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
  await expect(mainPanel.getByTestId(PageObjectId.HEADER_TITLE)).toContainText(
    "Test Title 1",
  );

  // Phase 2: Page Refresh & Error State

  // 5. Refresh the page
  await page.reload();
  await page.waitForLoadState("domcontentloaded");

  // Verify URL contains programmatic parameters
  await expect(page).toHaveURL(/[?&]settings=programatic/);
  await expect(page).toHaveURL(/[?&]config=programatic/);

  // Wait for the error notification to appear after reload
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ERROR),
  ).toBeVisible({ timeout: 15000 });

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

  // Verify chat is not started (no launcher should be visible)
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).not.toBeVisible();
  await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).not.toBeVisible();

  // Phase 3: Recovery & Different Property

  // 7. Call window.setChatConfig with different property (header name)
  await page.evaluate(() => {
    if (window.setChatConfig) {
      window.setChatConfig(
        {
          header: { name: "Test Assistant" },
        },
        {
          layout: "float",
          framework: "react",
          writeableElements: "false",
          direction: "default",
        },
      );
    }
  });

  // Wait for React re-render after config change
  await page.waitForTimeout(1000);

  // 8. Assertions for recovery - sidebar should be visible again with Leave button
  // Check if launcher is visible (it might be in float mode)
  const launcherCount = await page.getByTestId(PageObjectId.LAUNCHER).count();

  if (launcherCount > 0) {
    // In float mode, verify the header name is applied by checking it in the launcher area first
    await expect(page.getByTestId(PageObjectId.HEADER_NAME)).toContainText(
      "Test Assistant",
    );

    // Open the chat by clicking the launcher (same approach as smoke test)
    await page.getByTestId(PageObjectId.LAUNCHER).click();

    // Wait for the main panel to appear
    const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
    await expect(mainPanel).toBeVisible({ timeout: 15000 });

    // Verify the header name is also applied in the main panel
    await expect(mainPanel.getByTestId(PageObjectId.HEADER_NAME)).toContainText(
      "Test Assistant",
    );
  } else {
    // If no launcher, we're in embedded mode - check for main panel directly
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible({
      timeout: 15000,
    });
    const mainPanelForName = page.getByTestId(PageObjectId.MAIN_PANEL);
    await expect(
      mainPanelForName.getByTestId(PageObjectId.HEADER_NAME),
    ).toContainText("Test Assistant");
  }

  await page.waitForTimeout(1000);

  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ERROR),
  ).not.toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
  await expect(page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR)).toBeVisible();
});

test("programmatic mode without config prevents chat startup", async ({
  page,
}) => {
  // Block analytics script to avoid cookie consent issues
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());

  // Navigate directly to programmatic mode URL without calling setChatConfig
  await page.goto("/?settings=programatic&config=programatic");
  await page.waitForLoadState("domcontentloaded");

  // Clear session storage to ensure clean state
  await page.evaluate(() => {
    if (window.chatInstance) {
      window.chatInstance.destroySession();
    }
  });

  // Wait for the error notification to appear
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ERROR),
  ).toBeVisible({ timeout: 15000 });

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
    if (window.setChatConfig) {
      window.setChatConfig(
        {
          header: { title: "Recovery Test" },
        },
        {
          layout: "float",
          framework: "react",
          writeableElements: "false",
          direction: "default",
        },
      );
    }
  });

  // Wait for configuration to take effect and chat to initialize
  await page.waitForTimeout(1000); // Brief wait for state to settle

  // Now chat should be started - check for either launcher (float) or chat interface (embedded)
  const launcherCount = await page.getByTestId(PageObjectId.LAUNCHER).count();
  if (launcherCount > 0) {
    await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible({
      timeout: 15000,
    });
  } else {
    // If no launcher, we're in embedded mode - check for chat interface
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible({
      timeout: 15000,
    });
  }
  await expect(page.getByTestId(DemoPageObjectId.CONFIG_SIDEBAR)).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.LEAVE_PROGRAMMATIC_MODE_BUTTON),
  ).toBeVisible();
  await expect(
    page.getByTestId(DemoPageObjectId.PROGRAMMATIC_NOTIFICATION_ACTIVE),
  ).not.toBeVisible();
});
