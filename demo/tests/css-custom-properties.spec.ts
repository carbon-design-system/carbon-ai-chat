/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from "@carbon/ai-chat/server";
import { test, expect } from "@playwright/test";

import { destroyChatSession } from "./utils";

// Import types for window.chatInstance without emitting runtime code
import type {} from "../types/window";

// Float layout renders the launcher button, whose painted background reads
// `var(--cds-aichat-launcher-color-background, <default>)`. It is a good probe
// for token inheritance because the value has to reach through two shadow
// boundaries: the chat's render root and the launcher button's own shadow root.
const FLOAT_SETTINGS = "/?settings=%7B%22layout%22%3A%22float%22%7D";

// A distinctive color that is not any Carbon default, so a match is unambiguous.
const OVERRIDE = "rgb(255, 0, 255)";

test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

test("a host-page CSS custom property overrides a --cds-aichat-* token in the running chat", async ({
  page,
}) => {
  await page.goto(FLOAT_SETTINGS);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => Boolean(window.chatInstance), {
    timeout: 10000,
  });

  const launcher = page.getByTestId(PageObjectId.LAUNCHER);
  await expect(launcher).toBeVisible({ timeout: 15000 });

  // Reads the painted background of the launcher button's inner `part`.
  const readLauncherBackground = () =>
    launcher.evaluate((host: Element) => {
      const root = (host as HTMLElement).shadowRoot;
      const button =
        root?.querySelector('[part~="button"]') ??
        root?.querySelector("button");
      return button ? getComputedStyle(button).backgroundColor : null;
    });

  // Baseline: the launcher renders with the built-in default (Carbon
  // button-primary), not our override color.
  const before = await readLauncherBackground();
  expect(before).not.toBeNull();
  expect(before).not.toBe(OVERRIDE);

  // A host page sets the token on the document root — the DOM equivalent of a
  // page stylesheet rule `:root { --cds-aichat-launcher-color-background: ... }`.
  // The chat no longer declares this token on its render container, so the value
  // inherits through the shadow boundary instead of being shadowed by a default.
  await page.evaluate((color) => {
    document.documentElement.style.setProperty(
      "--cds-aichat-launcher-color-background",
      color,
    );
  }, OVERRIDE);

  // The launcher button picks up the host value.
  await expect.poll(readLauncherBackground, { timeout: 5000 }).toBe(OVERRIDE);
});
