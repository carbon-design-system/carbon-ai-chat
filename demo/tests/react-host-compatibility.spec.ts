/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { test, expect, type Page } from '@playwright/test';

/**
 * Loads `host-compatibility.html`, which imports the React and web-component
 * entries in the order its `order` parameter names. Every navigation is a new
 * page, so each case gets its own module graph and custom-element registry.
 *
 * Whatever loads first, a React chat keeps rendering in the host's React tree:
 * host context reaches its custom content, that content keeps its state, and
 * page CSS reaches it. Loading the web-component entry later wakes a plain
 * `cds-aichat-container` that connected while no renderer existed.
 */

declare global {
  interface Window {
    hostCompatibility: {
      reactInstance?: unknown;
      wcInstance?: unknown;
      setTheme?: (theme: string) => void;
      loaded: string[];
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.route(/.*ibm-common\.js$/, (route) => route.abort());
});

async function openHarness(page: Page, order: string, loaded: string[]) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/host-compatibility.html?order=${order}`);
  await page.waitForFunction(
    (expected) =>
      window.hostCompatibility?.loaded.join(',') === expected.join(','),
    loaded,
    { timeout: 20000 }
  );
  return errors;
}

/** Counts render targets across every shadow root on the page. */
function countRenderTargets(page: Page) {
  return page.evaluate(() => {
    let count = 0;
    const walk = (root: Document | ShadowRoot) => {
      count += root.querySelectorAll('.cds-aichat--react-app').length;
      root.querySelectorAll('*').forEach((node) => {
        if (node.shadowRoot) {
          walk(node.shadowRoot);
        }
      });
    };
    walk(document);
    return count;
  });
}

async function expectLiveReactChat(page: Page) {
  expect(await countRenderTargets(page)).toBe(1);
  expect(
    await page.evaluate(() => customElements.get('cds-aichat-react'))
  ).toBeUndefined();

  const instanceBefore = await page.evaluateHandle(
    () => window.hostCompatibility.reactInstance
  );
  await page.evaluate(() =>
    (
      window.hostCompatibility.reactInstance as {
        messaging: { addMessage: (message: unknown) => Promise<void> };
      }
    ).messaging.addMessage({
      id: 'host-compat',
      output: {
        generic: [{ response_type: 'user_defined', user_defined: {} }],
      },
    })
  );

  const content = page.getByTestId('host_compat_udr');
  await expect(content).toHaveText('light:0', { timeout: 15000 });
  await content.click();
  await expect(content).toHaveText('light:1');

  await page.evaluate(() => window.hostCompatibility.setTheme?.('dark'));
  await expect(content).toHaveText('dark:1');

  await expect
    .poll(() => content.evaluate((node) => getComputedStyle(node).color))
    .toBe('rgb(255, 0, 255)');
  expect(
    await page.evaluate(
      (before) => window.hostCompatibility.reactInstance === before,
      instanceBefore
    )
  ).toBe(true);
}

test('React chat stays live when the web-component entry loads after it', async ({
  page,
}) => {
  const errors = await openHarness(page, 'react,wc', ['react', 'wc']);
  await expectLiveReactChat(page);
  expect(errors).toEqual([]);
});

test('React chat renders in the host tree when the web-component entry loads first', async ({
  page,
}) => {
  const errors = await openHarness(page, 'wc,react', ['wc', 'react']);
  await expectLiveReactChat(page);
  expect(errors).toEqual([]);
});

test('a plain web component connected before its entry loads wakes when it does', async ({
  page,
}) => {
  const errors = await openHarness(page, 'wait', [
    'react-entry',
    'plain',
    'wc',
  ]);

  await page.waitForFunction(
    () => Boolean(window.hostCompatibility.wcInstance),
    {
      timeout: 20000,
    }
  );
  await expect(
    page.locator('#plain-host').getByTestId(PageObjectId.INPUT)
  ).toBeVisible({ timeout: 15000 });
  expect(await countRenderTargets(page)).toBe(1);
  expect(errors).toEqual([]);
});
