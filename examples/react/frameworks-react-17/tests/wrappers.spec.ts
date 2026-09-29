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
 * `ChatCustomElement` mounts and exchanges a message on React 17, with no
 * page errors. The version check guards the example's own install: a hoisted
 * React from another workspace would make the rest of this file prove
 * nothing.
 */

test('installs React 17 for this example', () => {
  const { version } = JSON.parse(
    readFileSync(
      new URL('../node_modules/react/package.json', import.meta.url),
      'utf8'
    )
  );
  expect(version.split('.')[0]).toBe('17');
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
    page.getByText(`Echo from the React 17 mock backend`).first()
  ).toBeVisible({ timeout: 10000 });
}

test('ChatCustomElement renders and sends a message on React 17', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?wrapper=custom');
  await sendAndExpectEcho(page, 'hello from ChatCustomElement');
  expect(errors).toEqual([]);
});
