/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { BusEventType, PageObjectId, ViewType } from "@carbon/ai-chat/server";
import type { Locator, Page } from "@playwright/test";
import * as aChecker from "accessibility-checker";

// Import types for window globals used in evaluated browser context.
import type {} from "../types/window";

/**
 * Strict Content-Security-Policy that tests enforce against the demo. The
 * production demo ships without any CSP (ibm-common.js + Tealium + TrustArc
 * need broad inline-style and origin access that's not worth maintaining in
 * a meta-tag allowlist for a GitHub Pages demo). Tests route-abort
 * ibm-common.js, so the third-party noise is isolated and we can hold the
 * demo's own code to this strict policy. `ws:`/`wss:` are allowed in
 * connect-src for webpack-dev-server HMR. `frame-ancestors` is omitted —
 * browsers ignore it when delivered via <meta>.
 */
const TEST_CSP =
  "default-src 'self'; " +
  "script-src 'self' https://1.www.s81c.com https://www.youtube.com https://player.vimeo.com https://cdn.embed.ly https://w.soundcloud.com; " +
  "style-src 'self' https://1.www.s81c.com; " +
  "img-src 'self' data: blob: https://1.www.s81c.com https://live.staticflickr.com; " +
  "font-src 'self' https://1.www.s81c.com; " +
  "connect-src 'self' https://1.www.s81c.com ws: wss:; " +
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://w.soundcloud.com https://cdnapisec.kaltura.com https://web-chat.assistant.test.watson.cloud.ibm.com; " +
  "media-src https://web-chat.assistant.test.watson.cloud.ibm.com; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self';";

const cspInstalledPages = new WeakSet<Page>();

/**
 * Route-rewrites the demo's document response to inject a strict
 * Content-Security-Policy meta tag. The production demo ships with no CSP
 * enforcement; this brings strict enforcement back at test time so the
 * Playwright suite can catch CSP regressions in our own code. Must be called
 * BEFORE `page.goto` so the route handler is registered when the document is
 * fetched. Idempotent per page so beforeEach + prepareDemoPage callers don't
 * stack duplicate route handlers.
 */
export const installTestCsp = async (page: Page) => {
  if (cspInstalledPages.has(page)) {
    return;
  }
  cspInstalledPages.add(page);
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.resourceType() !== "document") {
      // Defer to other route handlers (e.g. the ibm-common.js abort) rather
      // than passing through to the network unconditionally.
      return route.fallback();
    }
    // webpack-dev-server closes idle keep-alive sockets after ~5s. Playwright's
    // APIRequestContext can reuse a socket that the server has already closed,
    // surfacing as `read ECONNRESET` on the next request between tests. Force a
    // fresh connection per document fetch to avoid the stale-socket window, and
    // retry once on transient socket errors as defense in depth.
    const fetchHeaders = { ...request.headers(), connection: "close" };
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await route.fetch({ headers: fetchHeaders });
        break;
      } catch (err) {
        const message = (err as Error).message ?? "";
        if (attempt === 1 || !/ECONNRESET|socket hang up/i.test(message)) {
          throw err;
        }
      }
    }
    if (!response) {
      throw new Error("route.fetch did not produce a response");
    }
    const status = response.status();
    if (status >= 300 && status < 400) {
      return route.fulfill({ response });
    }
    const body = await response.text();
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${TEST_CSP}">`;
    // Match `<head>` with or without attributes so e.g. `<head data-foo>`
    // doesn't silently no-op the CSP injection.
    const injected = body.replace(
      /<head\b[^>]*>/i,
      (match) => `${match}${cspMeta}`,
    );
    const headers = { ...response.headers() };
    delete headers["content-length"];
    await route.fulfill({
      status,
      headers,
      body: injected,
    });
  });
};

/**
 * Shape of a captured Content-Security-Policy violation. Mirrors the fields on
 * `SecurityPolicyViolationEvent` that are useful for reporting which directive
 * blocked what.
 */
export interface CspViolation {
  blockedURI: string;
  violatedDirective: string;
  effectiveDirective: string;
  sourceFile: string;
  lineNumber: number;
  columnNumber: number;
  sample: string;
}

/**
 * Installs a `securitypolicyviolation` event listener via `page.addInitScript`
 * so it is in place BEFORE any inline script, inline style, or external
 * resource on the page is evaluated. Violations accumulate on
 * `window.__cspViolations`. Playwright re-applies init scripts on every
 * navigation, so the array resets per navigation — the guard captures
 * violations against whatever page the test is currently exercising.
 *
 * Call this before `page.goto` (prepareDemoPage handles that automatically).
 */
export const installCspGuard = async (page: Page) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __cspViolations?: CspViolation[] };
    if (w.__cspViolations) {
      return;
    }
    const violations: CspViolation[] = [];
    w.__cspViolations = violations;
    window.addEventListener("securitypolicyviolation", (event) => {
      violations.push({
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        effectiveDirective: event.effectiveDirective,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber,
        sample: event.sample,
      });
    });
  });
};

/**
 * Reads the CSP violations accumulated since the most recent navigation.
 * Returns an empty array if `installCspGuard` was not called or the page
 * has not yet finished its first navigation.
 */
export const getCspViolations = async (page: Page): Promise<CspViolation[]> => {
  return page.evaluate(() => {
    const w = window as unknown as { __cspViolations?: CspViolation[] };
    return w.__cspViolations ?? [];
  });
};

export interface ExpectNoCspViolationsOptions {
  /**
   * Directives to ignore when asserting. Pass an empty array (default) to
   * fail on any captured violation.
   */
  ignoreDirectives?: string[];
}

/**
 * Fails the test if any CSP violations have been recorded since the most
 * recent navigation, with a readable summary of each violation. Pair with
 * `installCspGuard` in beforeEach (or rely on `prepareDemoPage`, which
 * installs the guard automatically).
 */
export const expectNoCspViolations = async (
  page: Page,
  options: ExpectNoCspViolationsOptions = {},
) => {
  const ignored = new Set(options.ignoreDirectives ?? []);
  const violations = (await getCspViolations(page)).filter(
    (v) => !ignored.has(v.effectiveDirective || v.violatedDirective),
  );
  if (violations.length === 0) {
    return;
  }
  const summary = violations
    .map((v) => {
      const directive = v.effectiveDirective || v.violatedDirective;
      const target = v.blockedURI || v.sample || "<inline>";
      const location = v.sourceFile
        ? ` at ${v.sourceFile}:${v.lineNumber}:${v.columnNumber}`
        : "";
      return `  - ${directive}: ${target}${location}`;
    })
    .join("\n");
  throw new Error(
    `Expected no CSP violations, but ${violations.length} were recorded:\n${summary}`,
  );
};

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
 *
 * Also injects a strict CSP into the document response and installs a
 * CSP-violation guard before navigation so tests can call
 * `expectNoCspViolations(page)` to assert the page rendered without tripping
 * the test-time CSP.
 */
export const prepareDemoPage = async (
  page: Page,
  { setChatConfig = false }: PrepareDemoPageOptions = {},
) => {
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
  await installTestCsp(page);
  await installCspGuard(page);
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
