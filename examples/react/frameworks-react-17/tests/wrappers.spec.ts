/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { readFileSync } from 'fs';
import { PageObjectId } from '@carbon/ai-chat/server';
import { test, expect, type Page } from '@playwright/test';

test('waits for the app before callbacks and preserves live host DOM props', async ({
  page,
}) => {
  let releaseEntry: () => void;
  const entryGate = new Promise<void>((resolve) => {
    releaseEntry = resolve;
  });
  let entryRequested = false;
  await page.route(/\/chat\.ChatAppEntry[^/]*\.js(?:\?.*)?$/, async (route) => {
    entryRequested = true;
    await entryGate;
    await route.continue();
  });
  await page.goto('/?host-props', { waitUntil: 'domcontentloaded' });
  const callbacks = page.getByTestId('host-callbacks');
  try {
    await expect.poll(() => entryRequested).toBe(true);
    // Give startup time to advance while the app module is still unavailable.
    await page.waitForTimeout(250);
    await expect(callbacks).toHaveText('none');
  } finally {
    releaseEntry();
  }
  const host = page.getByTestId('props-host');
  const click = page.getByTestId('host-click');
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible({
    timeout: 10000,
  });
  await expect(callbacks).toHaveText('before,after');
  const originalHost = await host.elementHandle();
  const attributeNames = [
    'id',
    'class',
    'classname',
    'title',
    'hidden',
    'draggable',
    'spellcheck',
    'contenteditable',
    'tabindex',
    'aria-label',
    'aria-hidden',
  ];
  const attributes = () =>
    host.evaluate(
      (node, names) =>
        Object.fromEntries(
          names.map((name) => [name, node.getAttribute(name)])
        ),
      attributeNames
    );
  const initial = {
    id: 'host-initial',
    class: 'host-initial',
    classname: null,
    title: 'initial',
    hidden: null,
    draggable: 'true',
    spellcheck: 'true',
    contenteditable: 'false',
    tabindex: '2',
    'aria-label': 'initial',
    'aria-hidden': 'false',
  };
  expect(await attributes()).toEqual(initial);
  await expect(host).toHaveJSProperty('hidden', false);
  await expect(host).toHaveCSS('color', 'rgb(1, 2, 3)');

  // A host rerender reapplies native properties even when their props stay equal.
  await host.evaluate((node) => {
    (node as HTMLElement).hidden = true;
  });
  await host.dispatchEvent('click');
  await expect(click).toHaveText('initial:cds-aichat-container');
  await expect(host).toHaveJSProperty('hidden', false);

  await page.getByRole('button', { name: 'Update host props' }).click();
  expect(await attributes()).toEqual({
    id: 'host-updated',
    class: 'host-updated',
    classname: null,
    title: 'updated',
    hidden: '',
    draggable: 'false',
    spellcheck: 'false',
    contenteditable: 'true',
    tabindex: '3',
    'aria-label': 'updated',
    'aria-hidden': 'true',
  });
  await expect(host).toHaveJSProperty('hidden', true);
  await expect(host).toHaveCSS('display', 'none');
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeHidden();
  await expect(host).toHaveCSS('padding', '4px');
  expect(await host.evaluate((node) => node.style.color)).toBe('');
  await host.dispatchEvent('click');
  await expect(click).toHaveText('updated:cds-aichat-container');

  await page.getByRole('button', { name: 'Remove host props' }).click();
  expect(await attributes()).toEqual(
    Object.fromEntries(attributeNames.map((name) => [name, null]))
  );
  await expect(host).toHaveJSProperty('hidden', false);
  await expect(host).toHaveJSProperty('contentEditable', 'inherit');
  await expect(page.getByTestId(PageObjectId.LAUNCHER)).toBeVisible();
  expect(await host.evaluate((node) => node.style.padding)).toBe('');
  await host.dispatchEvent('click');
  await expect(click).toHaveText('updated:cds-aichat-container');
  expect(await originalHost.evaluate((node) => node.isConnected)).toBe(true);
  await expect(callbacks).toHaveText('before,after');
});

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
