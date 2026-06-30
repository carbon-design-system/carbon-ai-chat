/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from "@carbon/ai-chat/server";
import { test, expect } from "@playwright/test";

/**
 * Regression guard for issue #1382.
 *
 * Customers reported on React 17/18 host apps that clicking the send button
 * left the typed text in the input field. The Enter-key path worked. The
 * theory is a @lit/react native-event vs. React batching interaction that
 * stops the contenteditable DOM sync from running. The fix clears the DOM
 * imperatively from `send()`. This test runs against the React 17 example
 * because that is the lowest-React-version environment we ship an example
 * for, and the only one we can automate that matches the customer-reported
 * setup.
 */
test("send button clears the input field on React 17", async ({ page }) => {
  await page.goto("/");

  const launcher = page.getByTestId(PageObjectId.LAUNCHER);
  await expect(launcher).toBeVisible({ timeout: 10000 });
  await launcher.click();

  const input = page.getByTestId(PageObjectId.INPUT);
  await expect(input).toBeVisible({ timeout: 10000 });

  await input.click();
  await input.fill("hello from react 17");

  await page.getByTestId(PageObjectId.INPUT_SEND).click();

  await expect(input).toHaveText("");
});

test("enter key clears the input field on React 17", async ({ page }) => {
  await page.goto("/");

  const launcher = page.getByTestId(PageObjectId.LAUNCHER);
  await expect(launcher).toBeVisible({ timeout: 10000 });
  await launcher.click();

  const input = page.getByTestId(PageObjectId.INPUT);
  await expect(input).toBeVisible({ timeout: 10000 });

  await input.click();
  await input.fill("hello from react 17 via enter");
  await input.press("Enter");

  await expect(input).toHaveText("");
});
