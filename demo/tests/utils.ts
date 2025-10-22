/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId, ViewType } from "@carbon/ai-chat/server";
import { sleep } from "@carbon/ai-chat-utils";
import type { Page } from "@playwright/test";

// Import types for window globals used in evaluated browser context.
import type {} from "../types/window";

/**
 * Demo-specific test IDs that are not part of the core @carbon/ai-chat package.
 * These are used for testing the demo application functionality.
 */
export enum DemoPageObjectId {
  /**
   * The setChatConfig mode active notification.
   */
  SET_CHAT_CONFIG_NOTIFICATION_ACTIVE = "set_chat_config_notification_active",

  /**
   * The setChatConfig mode error notification.
   */
  SET_CHAT_CONFIG_NOTIFICATION_ERROR = "set_chat_config_notification_error",

  /**
   * The configuration sidebar in demo.
   */
  CONFIG_SIDEBAR = "config_sidebar",

  /**
   * The leave setChatConfig mode button in the sidebar.
   */
  LEAVE_SET_CHAT_CONFIG_MODE_BUTTON = "leave_set_chat_config_mode_button",
}

interface PrepareDemoPageOptions {
  setChatConfig?: boolean;
}

/**
 * Blocks the analytics script before navigating to the demo so tests avoid cookie consent popups.
 * When `setChatConfig` is true, the page is loaded with the query param that activates setChatConfig mode.
 */
export const prepareDemoPage = async (
  page: Page,
  { setChatConfig = false }: PrepareDemoPageOptions = {},
) => {
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
  const targetPath = setChatConfig ? "/?config=setChatConfig" : "/";
  await page.goto(targetPath);
};

/**
 * Clears the chat session if one exists to ensure no state leaks between tests.
 */
export const destroyChatSession = async (page: Page) => {
  await page.evaluate(() => {
    if (window.chatInstance) {
      window.chatInstance.destroySession();
    }
  });
};

/**
 * Opens the chat's main window by waiting for the instance to be available on window and forwarding the enum value
 * from the test context into the page context. The evaluated browser scope cannot import modules directly, so the
 * enum is passed as an argument instead.
 */
export const openChatWindow = async (page: Page) => {
  await page.waitForFunction(() => Boolean(window.chatInstance));
  await page.evaluate(async (mainWindowView) => {
    if (!window.chatInstance) {
      return;
    }

    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await window.chatInstance.changeView(mainWindowView);
      const state = window.chatInstance.getState?.();
      if (state?.viewState?.mainWindow) {
        break;
      }
      await wait(200);
    }
  }, ViewType.MAIN_WINDOW);
  await page.waitForFunction(() => {
    const state = window.chatInstance?.getState?.();
    return state?.viewState?.mainWindow === true;
  });
};

/**
 * Waits for hydration to complete and optionally confirms that a specific panel is visible. Hydration shows an
 * overlay spinner (`hydrating_panel`) that needs to disappear before the UI is usable, so we always synchronise on
 * that first. Passing a `panelTestId` lets callers wait for whatever view should surface once hydration resolves.
 */
interface WaitForChatReadyOptions {
  timeout?: number;
  /**
   * Panel test id to wait for after hydration completes. Provide `null` when no specific panel visibility is
   * required (for example when the chat is expected to remain closed).
   */
  panelTestId?: PageObjectId | null;
}

export const waitForChatReady = async (
  page: Page,
  {
    timeout = 30_000,
    panelTestId = PageObjectId.MAIN_PANEL,
  }: WaitForChatReadyOptions = {},
) => {
  const hydratingPanel = page.getByTestId(PageObjectId.HYDRATING_PANEL);
  try {
    await hydratingPanel.waitFor({ state: "hidden", timeout });
  } catch (error) {
    // If the panel never appeared, ignore the timeout as the chat may hydrate instantly.
    const isVisible = await hydratingPanel.isVisible().catch(() => false);
    if (isVisible) {
      throw error;
    }
  }

  if (panelTestId) {
    await page.getByTestId(panelTestId).waitFor({
      state: "visible",
      timeout,
    });
  }

  await sleep(200);
};

/**
 * Waits for setChatConfig to be applied by checking for page state change.
 * This replaces arbitrary timeouts after setChatConfig calls.
 */
export const waitForSetChatConfigApplied = async (
  page: Page,
  timeout = 1000,
) => {
  await page.waitForFunction(
    () => {
      return window.chatInstance && window.chatInstance.getState?.();
    },
    { timeout },
  );
};
