/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { takeSnapshot, test, expect } from "@chromatic-com/playwright";
import { PageObjectId } from "@carbon/ai-chat/server";

import { RESPONSE_MAP } from "../src/customSendMessage/responseMap";
import {
  destroyChatSession,
  openChatViaLauncher,
  prepareDemoPage,
} from "./utils";

type FilterMode = "allowlist" | "blocklist";

const RESPONSE_FILTER_MODE: FilterMode =
  (process.env.CHROMATIC_RESPONSE_FILTER_MODE as FilterMode | undefined) ??
  "blocklist";

/**
 * Filter out responses that are currently unstable in visual CI due to external embeds or
 * timing-heavy behavior.
 */
const FILTERED_RESPONSE_KEYS = new Set<string>([
  "audio - mp3",
  "audio - soundcloud",
  "iframe",
  "text (consecutive responses)",
  "video - kaltura",
  "video - vimeo",
  "video - youtube",
  "table",
  "table (stream)",
]);

const RESPONSE_KEYS = Object.keys(RESPONSE_MAP).filter((key) => {
  if (RESPONSE_FILTER_MODE === "allowlist") {
    return FILTERED_RESPONSE_KEYS.has(key);
  }

  return !FILTERED_RESPONSE_KEYS.has(key);
});

const STREAMING_RESPONSE_KEYS = new Set<string>(
  RESPONSE_KEYS.filter((key) => key.includes("stream")),
);

const DELAYED_RESPONSE_KEYS = new Set<string>([
  "text (delayed response)",
  "text (delayed streaming response)",
]);

const snapshotNameForKey = (key: string) =>
  `demo response: ${key.replace(/\s+/g, " ").trim()}`;

const takeChromaticSnapshot = async (
  page: import("@playwright/test").Page,
  responseKey: string,
) => {
  const snapshotName = snapshotNameForKey(responseKey);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await takeSnapshot(page, snapshotName, test.info());
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChromaticRuntimeNotReady = message.includes(
        "window.__chromatic_takeSnapshot is not a function",
      );

      if (!isChromaticRuntimeNotReady || attempt === 1) {
        throw error;
      }

      await page.waitForTimeout(250);
    }
  }
};

const waitForAssistantResponse = async (
  page: import("@playwright/test").Page,
  responseKey: string,
) => {
  const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
  const assistantMessages = mainPanel.locator(
    '[data-testid^="message-by-index-"]',
  );

  await expect(assistantMessages.last()).toBeVisible({ timeout: 30000 });

  if (
    STREAMING_RESPONSE_KEYS.has(responseKey) ||
    DELAYED_RESPONSE_KEYS.has(responseKey)
  ) {
    await page.waitForTimeout(1500);
  }

  if (DELAYED_RESPONSE_KEYS.has(responseKey)) {
    await page.waitForTimeout(2000);
  }

  await expect(mainPanel).toBeVisible();
};

test.describe("Chromatic visual smoke", () => {
  test.beforeEach(async ({ page }) => {
    await prepareDemoPage(page, { chromatic: true });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => Boolean(window.chatInstance), {
      timeout: 10000,
    });
    await openChatViaLauncher(page);
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId(PageObjectId.INPUT)).toBeVisible({
      timeout: 10000,
    });
  });

  test.afterEach(async ({ page }) => {
    await destroyChatSession(page);
  });

  for (const responseKey of RESPONSE_KEYS) {
    test(`captures ${responseKey}`, async ({ page }) => {
      test.slow();

      const input = page.getByTestId(PageObjectId.INPUT);
      const sendButton = page.getByTestId(PageObjectId.INPUT_SEND);
      const chatWidget = page.getByTestId(PageObjectId.CHAT_WIDGET);

      await input.click();
      await input.fill(responseKey);
      await sendButton.click();

      await waitForAssistantResponse(page, responseKey);

      await expect(chatWidget).toBeVisible();
      await takeChromaticSnapshot(page, responseKey);
    });
  }
});
