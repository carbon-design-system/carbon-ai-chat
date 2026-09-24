/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { readFileSync } from 'fs';
import { PageObjectId } from '@carbon/ai-chat/server';
import { test, expect, type Page } from '@playwright/test';

/**
 * Both React components mount and exchange a message on React 18, with no
 * page errors. The version check guards the example's own install: a hoisted
 * React from another workspace would make the rest of this file prove
 * nothing.
 */

test('installs React 18 for this example', () => {
  const { version } = JSON.parse(
    readFileSync(
      new URL('../node_modules/react/package.json', import.meta.url),
      'utf8'
    )
  );
  expect(version.split('.')[0]).toBe('18');
});

async function sendAndExpectEcho(page: Page, text: string) {
  const input = page.getByTestId(PageObjectId.INPUT);
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.click();
  await input.fill(text);
  // Send through the button once it enables: the rich editor accepts Enter
  // only after it has taken the typed value.
  const send = page.getByTestId(PageObjectId.INPUT_SEND);
  await expect(send).toBeEnabled({ timeout: 10000 });
  await send.click();
  // The echo, not the sent text: markdown rewrites the quotes around it.
  await expect(
    page.getByText(`Echo from the React 18 mock backend`).first()
  ).toBeVisible({ timeout: 10000 });
}

for (const [label, path] of [
  ['ChatContainer', '/'],
  ['ChatCustomElement', '/?wrapper=custom'],
] as const) {
  test(`${label} renders and sends a message on React 18`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(path);
    if (label === 'ChatContainer') {
      const launcher = page.getByTestId(PageObjectId.LAUNCHER);
      await expect(launcher).toBeVisible({ timeout: 10000 });
      await launcher.click();
    }

    await sendAndExpectEcho(page, `hello from ${label}`);
    expect(errors).toEqual([]);
  });
}
