/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { BusEventType, PageObjectId, ViewType } from "@carbon/ai-chat/server";
import type { Locator, Page } from "@playwright/test";
import * as aChecker from "accessibility-checker";

// Import types for window globals used in evaluated browser context.
import type {} from "../types/window";

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

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
 * Opens the chat by clicking the launcher button if it's visible.
 * This is useful for fullscreen layouts where the chat may start closed.
 */
export const openChatViaLauncher = async (page: Page) => {
  const launcher = page.getByTestId(PageObjectId.LAUNCHER);
  if (await launcher.isVisible({ timeout: 1000 }).catch(() => false)) {
    await launcher.click();
  }
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

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await window.chatInstance.changeView(mainWindowView);
      const state = window.chatInstance.getState?.();
      if (state?.viewState?.mainWindow) {
        break;
      }
      await sleep(200);
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

/**
 * Sends a message through the chat instance and waits for the response to render.
 * Uses the public `window.chatInstance.send` API and event listeners for reliable response detection.
 */
export const sendChatMessage = async (page: Page, text: string) => {
  await page.waitForFunction(() => Boolean(window.chatInstance?.send));

  // Send message and wait for response using event listener
  await page.evaluate(async (message) => {
    async function sleep(milliseconds: number) {
      await new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
      });
    }

    if (!window.chatInstance) {
      throw new Error("Chat instance is not available.");
    }

    // Set up promise to wait for receive event
    const responseReceived = new Promise<void>((resolve) => {
      window.chatInstance?.once({
        type: "receive" as BusEventType,
        handler: () => {
          resolve();
        },
      });
    });

    // Send the message
    await window.chatInstance.send(message);

    // Wait for the response
    await responseReceived;

    await sleep(200);
  }, text);
};

/**
 * Clears the current conversation history without closing the chat window.
 * Relies on the public messaging API to reset state between tests.
 */
export const clearConversation = async (page: Page) => {
  await page.waitForFunction(() =>
    Boolean(window.chatInstance?.messaging?.clearConversation),
  );

  await page.evaluate(async () => {
    if (!window.chatInstance?.messaging?.clearConversation) {
      throw new Error(
        "Chat instance messaging.clearConversation is not available.",
      );
    }
    await window.chatInstance.messaging.clearConversation();
  });
};

// ===== Accessibility Testing =====

/**
 * Configuration for accessibility checker
 * See: https://github.com/IBMa/equal-access/blob/master/accessibility-checker/README.md
 */
export const setupAccessibilityChecker = () => {
  aChecker.setConfig({
    // Rule set: IBM_Accessibility or WCAG_2_1
    ruleArchive: "latest",
    // Violation policy - what level should fail tests
    policies: ["IBM_Accessibility"],
    // Report levels: violation, potentialviolation, recommendation, potentialrecommendation, manual, pass
    reportLevels: [
      "violation",
      "potentialviolation",
      "recommendation",
      "manual",
    ],
    // Fail the test if violations are found
    failLevels: ["violation"],
    // Output folder for accessibility reports
    outputFolder: "test-results/accessibility",
    outputFormat: ["html", "json"],
  } as any);
};

/**
 * Run accessibility check on a specific element or the full page
 */
export const checkAccessibility = async (
  pageOrLocator: Page | Locator,
  label: string,
  options?: { scopeSelector?: string },
) => {
  let page: Page;
  let scopeSelector: string | undefined;

  if ("content" in pageOrLocator) {
    // It's a Page - scan the whole page
    page = pageOrLocator;
    scopeSelector = options?.scopeSelector;
  } else {
    // It's a Locator - get the page and determine scope selector
    page = pageOrLocator.page();

    // Try to get a selector for filtering results
    // First check if it's a data-testid locator
    const testId = await pageOrLocator
      .getAttribute("data-testid")
      .catch(() => null);
    if (testId) {
      scopeSelector = `[data-testid="${testId}"]`;
    } else {
      scopeSelector = options?.scopeSelector;
    }
  }

  // Run accessibility scan on the page using Playwright integration
  const results = await aChecker.getCompliance(page, label);

  return processResults(results, label, scopeSelector);
};

/**
 * Process accessibility scan results
 */
function processResults(results: any, label: string, scopeSelector?: string) {
  // Check if results has an error
  if (!results || !("report" in results)) {
    throw new Error(`Accessibility checker failed for "${label}"`);
  }

  // Type guard to ensure we have a report (not an error)
  if (!("results" in results.report)) {
    throw new Error(`Accessibility checker error for "${label}"`);
  }

  const report = results.report as any;
  let allViolations =
    report.results?.filter(
      (result: { level: string }) =>
        result.level === "violation" || result.level === "potentialviolation",
    ) || [];

  // Filter violations to only those within the scope selector if provided
  if (scopeSelector) {
    allViolations = allViolations.filter((v: any) => {
      const domPath = v.path?.dom || "";
      // For chat widget scoping, check if the path goes through cds-aichat-react
      // which is the chat widget's shadow DOM container
      if (scopeSelector.includes('data-testid="chat_widget"')) {
        return domPath.includes("cds-aichat-react");
      }
      // Fallback to checking if selector is in path or snippet
      return (
        domPath.includes(scopeSelector) ||
        (v.snippet && v.snippet.includes(scopeSelector))
      );
    });
  }

  // Only fail if there are violations (in scope if specified)
  if (allViolations.length > 0) {
    // Format violations in a cleaner way
    const violationSummary = allViolations
      .slice(0, 5)
      .map(
        (v: any) =>
          `  - ${v.ruleId}: ${v.message}\n    Path: ${v.path?.dom || "N/A"}\n    Help: ${v.help || v.helpUrl || "N/A"}`,
      )
      .join("\n\n");

    const moreText =
      allViolations.length > 5
        ? `\n\n... and ${allViolations.length - 5} more`
        : "";

    const scopeNote = scopeSelector ? `\n(Scoped to: ${scopeSelector})` : "";

    console.error(
      `Accessibility violations found in "${label}" (${allViolations.length} total)${scopeNote}:\n\n${violationSummary}${moreText}\n\nSee detailed reports in test-results/accessibility/`,
    );
  }

  return results;
}
