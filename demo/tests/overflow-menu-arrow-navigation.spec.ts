/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { test, expect } from "@playwright/test";
import { PageObjectId } from "@carbon/ai-chat/server";
import {
  prepareDemoPage,
  destroyChatSession,
  openChatWindow,
  waitForChatReady,
  waitForSetChatConfigApplied,
} from "./utils";

// Import types for window.setChatConfig without emitting runtime code
import type {} from "../types/window";

// Setup common to all tests
test.beforeEach(async ({ page }) => {
  // Load demo in setChatConfig mode and block analytics pop-ups
  await prepareDemoPage(page, { setChatConfig: true });
});

// Clear session between all tests to ensure clean state
test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

/**
 * Helper function to find the currently focused overflow menu item by traversing shadow DOM.
 * Returns the text content of the focused item, or null if no item is focused.
 */
async function getFocusedMenuItemText(page: any): Promise<string | null> {
  return await page.evaluate(() => {
    function findFocusedElement(root: Document | ShadowRoot): Element | null {
      const activeElement = root.activeElement;

      if (!activeElement) {
        return null;
      }

      // Check if this is an overflow menu item
      if (
        activeElement.tagName.toLowerCase() === "cds-overflow-menu-item" ||
        activeElement.getAttribute("role") === "menuitem"
      ) {
        return activeElement;
      }

      // Traverse into shadow DOM if it exists
      if (activeElement.shadowRoot) {
        return findFocusedElement(activeElement.shadowRoot);
      }

      return null;
    }

    const focusedItem = findFocusedElement(document);
    return focusedItem ? focusedItem.textContent?.trim() || null : null;
  });
}

/**
 * Helper function to open the overflow menu and wait for it to be visible.
 */
async function openOverflowMenu(page: any) {
  // Find and click the overflow menu button in the navigation slot
  const overflowMenuButton = page.locator("cds-overflow-menu").first();
  await overflowMenuButton.click();

  // Wait for the first menu item to be visible
  await page
    .locator("cds-overflow-menu-item")
    .first()
    .waitFor({ state: "visible" });
}

/**
 * Helper function to focus the first menu item in the overflow menu.
 */
async function focusFirstMenuItem(page: any) {
  // Focus the first menu item
  const firstMenuItem = page.locator("cds-overflow-menu-item").first();
  await firstMenuItem.focus();
}

test("arrow key navigation in overflow menu", async ({ page }) => {
  // Configure chat with menu options enabled
  await page.evaluate(async () => {
    if (!window.setChatConfig) {
      throw new Error("setChatConfig is not available");
    }
    await window.setChatConfig({
      header: {
        title: "Test Chat",
        menuOptions: [
          {
            text: "Help",
            handler: () => alert("Help clicked!"),
          },
          {
            text: "Documentation",
            href: "https://example.com",
            target: "_blank",
          },
          {
            text: "Settings",
            handler: () => alert("Settings clicked!"),
          },
        ],
      },
      launcher: { isOn: false },
      openChatByDefault: true,
    });
  });

  await waitForSetChatConfigApplied(page);

  // Open the chat interface and wait for it to be ready
  await openChatWindow(page);
  await waitForChatReady(page, { panelTestId: PageObjectId.MAIN_PANEL });

  // Open the overflow menu
  await openOverflowMenu(page);

  // Focus the first menu item
  await focusFirstMenuItem(page);

  // Verify first item is focused
  let focusedText = await getFocusedMenuItemText(page);
  expect(focusedText).toBe("Help");

  // Press ArrowDown key
  await page.keyboard.press("ArrowDown");

  // Wait for focus to update by checking that the second item is focused
  await page.waitForFunction(
    () => {
      function findFocusedElement(root: Document | ShadowRoot): Element | null {
        const activeElement = root.activeElement;
        if (!activeElement) {
          return null;
        }

        if (
          activeElement.tagName.toLowerCase() === "cds-overflow-menu-item" ||
          activeElement.getAttribute("role") === "menuitem"
        ) {
          return activeElement;
        }

        if (activeElement.shadowRoot) {
          return findFocusedElement(activeElement.shadowRoot);
        }

        return null;
      }

      const focusedItem = findFocusedElement(document);
      return focusedItem?.textContent?.trim() === "Documentation";
    },
    { timeout: 2000 },
  );

  // Verify second item is now focused
  focusedText = await getFocusedMenuItemText(page);
  expect(focusedText).toBe("Documentation");
});
