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

test("disclaimer disappears when Accept is clicked", async ({ page }) => {
  // Set config with disclaimer enabled
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        disclaimer: {
          isOn: true,
          disclaimerHTML: "Please accept this disclaimer to continue.",
        },
        header: { title: "Test Chat" },
      });
    }
  });

  await waitForSetChatConfigApplied(page);

  await openChatWindow(page);
  // Disclaimer sits on top of the main panel, so we only wait for hydration rather than the main panel itself.
  await waitForChatReady(page, {
    panelTestId: PageObjectId.DISCLAIMER_PANEL,
  });

  // Disclaimer should be visible initially
  await expect(
    page.getByText("Please accept this disclaimer to continue."),
  ).toBeVisible();

  // Click the Accept button
  await page.getByTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON).click();

  // Disclaimer panel should disappear after accepting
  await expect(page.getByTestId(PageObjectId.DISCLAIMER_PANEL)).not.toBeVisible(
    {
      timeout: 10000,
    },
  );

  // Main panel should be visible
  await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible({
    timeout: 10000,
  });

  // Run accessibility check on the chat widget
  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, "Disclaimer - After Accept");
});

// Confirm that updating setChatConfig disclaimer content clears the accepted flag and reopens the panel.
test("disclaimer accepted state is cleared on content change", async ({
  page,
}) => {
  // Phase 1: Set initial disclaimer
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        disclaimer: {
          isOn: true,
          disclaimerHTML: "Please accept this disclaimer to continue.",
        },
        header: { title: "Test Chat" },
      });
    }
  });

  await waitForSetChatConfigApplied(page);

  await openChatWindow(page);
  await waitForChatReady(page, {
    panelTestId: PageObjectId.DISCLAIMER_PANEL,
  });

  // Verify initial disclaimer is visible
  await expect(
    page.getByText("Please accept this disclaimer to continue."),
  ).toBeVisible();

  // Accept the initial disclaimer
  await page.getByTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON).click();

  // Wait for disclaimer to disappear and main panel to appear
  await expect(page.getByTestId(PageObjectId.DISCLAIMER_PANEL)).not.toBeVisible(
    {
      timeout: 10000,
    },
  );
  await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible({
    timeout: 10000,
  });

  // Phase 2: Change disclaimer content - this should clear accepted state
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        disclaimer: {
          isOn: true,
          disclaimerHTML:
            "This is a new disclaimer that must be accepted again.",
        },
        header: { title: "Test Chat" },
      });
    }
  });

  await waitForSetChatConfigApplied(page);

  // The disclaimer should reappear after content change
  await waitForChatReady(page, {
    panelTestId: PageObjectId.DISCLAIMER_PANEL,
  });

  // Verify the new disclaimer content is visible
  await expect(
    page.getByText("This is a new disclaimer that must be accepted again."),
  ).toBeVisible();

  // Run accessibility check on the chat widget with new disclaimer
  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, "Disclaimer - New Content");
});

test("disclaimer enable and disable", async ({ page }) => {
  // Phase 1: Start with disclaimer enabled
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        disclaimer: {
          isOn: true,
          disclaimerHTML: "Test disclaimer message",
        },
        header: { title: "With Disclaimer" },
        openChatByDefault: true,
      });
    }
  });

  await waitForSetChatConfigApplied(page);

  // Phase 2: Disable disclaimer
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        disclaimer: {
          isOn: false,
          disclaimerHTML: "This should not be shown",
        },
        header: { title: "No Disclaimer" },
        openChatByDefault: true,
      });
    }
  });

  await waitForSetChatConfigApplied(page);

  await openChatWindow(page);

  // Main window, not disclaimer should not be visible when disabled
  await waitForChatReady(page, {
    panelTestId: null,
  });

  // Phase 3: Re-enable disclaimer
  await page.evaluate(async () => {
    if (window.setChatConfig) {
      await window.setChatConfig({
        disclaimer: {
          isOn: true,
          disclaimerHTML: "Disclaimer is back!",
        },
        header: { title: "Disclaimer Enabled Again" },
        openChatByDefault: true,
      });
    }
  });

  await waitForSetChatConfigApplied(page);

  await openChatWindow(page);

  // Disclaimer should be visible again with new content
  await expect(page.getByTestId(PageObjectId.DISCLAIMER_PANEL)).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText("Disclaimer is back!")).toBeVisible();

  // Run accessibility check on the chat widget with re-enabled disclaimer
  const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);
  await checkAccessibility(chatWidget, "Disclaimer - Re-enabled");
});
