/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Loads `host-compatibility.html`, which imports the React and web-component
 * entries in the order its `order` parameter names, or mounts one chat surface
 * that its `surface` parameter names. Every navigation is a new page, so each
 * case gets its own module graph and custom-element registry.
 *
 * Whatever loads first, a React chat keeps rendering in the host's React tree:
 * host context reaches its custom content, that content keeps its state, and
 * page CSS reaches it. The React host adds no height to the page, and page CSS
 * reaches the content the host puts in each slot.
 */

interface ChatInstanceHandle {
  messaging: { addMessage: (message: unknown) => Promise<void> };
  send: (request: unknown) => Promise<void>;
}

declare global {
  interface Window {
    hostCompatibility: {
      reactInstance?: ChatInstanceHandle;
      wcInstance?: ChatInstanceHandle;
      setTheme?: (theme: string) => void;
      scrollHeightBefore?: number;
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

  const instanceBefore = await page.evaluateHandle(
    () => window.hostCompatibility.reactInstance
  );
  await page.evaluate(() =>
    window.hostCompatibility.reactInstance?.messaging.addMessage({
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

/** Opens one chat surface and waits for its instance. */
async function openSurface(page: Page, surface: string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/host-compatibility.html?surface=${surface}`);
  const instanceKey = surface.startsWith('react')
    ? 'reactInstance'
    : 'wcInstance';
  await page.waitForFunction(
    (key) => Boolean(window.hostCompatibility?.[key]),
    instanceKey,
    { timeout: 20000 }
  );
  return { errors, instanceKey };
}

test('a float React chat adds no height to a full-height page', async ({
  page,
}) => {
  const { errors } = await openSurface(page, 'react-container');
  await page.waitForFunction(() =>
    window.hostCompatibility.loaded.includes('react')
  );
  const { before, after } = await page.evaluate(() => ({
    before: window.hostCompatibility.scrollHeightBefore,
    after: document.documentElement.scrollHeight,
  }));
  expect(before).toBeGreaterThan(0);
  expect(after).toBe(before);
  expect(errors).toEqual([]);
});

type SlotKind =
  | 'user-defined-response'
  | 'message-footer'
  | 'request-footer'
  | 'writeable-element'
  | 'input-node';

const ALL_KINDS: SlotKind[] = [
  'user-defined-response',
  'message-footer',
  'request-footer',
  'writeable-element',
  'input-node',
];

/**
 * The surfaces and slot kinds where page CSS reaches slotted content today.
 * `cds-aichat-container` keeps input nodes out of reach, and
 * `cds-aichat-custom-element` keeps every kind inside its own shadow root, so
 * those rows are not listed. The fixture still mounts `wc-custom`, so its rows
 * can join once they pass.
 */
const PAGE_CSS_ROWS: [string, SlotKind[]][] = [
  ['react-container', ALL_KINDS],
  ['react-custom', ALL_KINDS],
  [
    'wc-container',
    [
      'user-defined-response',
      'message-footer',
      'request-footer',
      'writeable-element',
    ],
  ],
];

/** Makes the chat render the given slot kind. */
async function triggerSlot(page: Page, instanceKey: string, kind: SlotKind) {
  if (kind === 'user-defined-response' || kind === 'message-footer') {
    await page.evaluate(
      (key) =>
        window.hostCompatibility[key as 'reactInstance'].messaging.addMessage({
          id: 'page-css',
          output: {
            generic: [
              { response_type: 'user_defined', user_defined: {} },
              {
                response_type: 'text',
                text: 'With a footer',
                message_item_options: {
                  custom_footer_slot: { slot_name: 'footer-1', is_on: true },
                },
              },
            ],
          },
        }),
      instanceKey
    );
  } else if (kind === 'request-footer' || kind === 'input-node') {
    await page.evaluate(
      (key) =>
        window.hostCompatibility[key as 'reactInstance'].send({
          id: 'rich',
          input: {
            message_type: 'text',
            text: 'Ship it',
            display_content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'taskCard', attrs: { label: 'Ship it' } }],
                },
              ],
            },
          },
        }),
      instanceKey
    );
  }
  // The writeable element shows with the welcome response on open.
}

for (const [surface, kinds] of PAGE_CSS_ROWS) {
  for (const kind of kinds) {
    test(`page CSS reaches the ${kind} on ${surface}`, async ({ page }) => {
      const { errors, instanceKey } = await openSurface(page, surface);
      await triggerSlot(page, instanceKey, kind);

      const node = page.locator(`.page-styled[data-kind="${kind}"]`).first();
      await expect(node).toBeVisible({ timeout: 15000 });
      expect(await node.evaluate((el) => getComputedStyle(el).color)).toBe(
        'rgb(1, 2, 3)'
      );
      expect(await node.evaluate((el) => el.getRootNode() === document)).toBe(
        true
      );
      expect(errors).toEqual([]);
    });
  }
}
