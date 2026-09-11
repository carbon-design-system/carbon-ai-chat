/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * The footer slot below a user message, end to end. This is where the rendering proofs for the slot and the
 * web-component callback land: neither has a unit-test harness, and jsdom cannot compute the `::slotted` styles the
 * spacing depends on.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { test, expect } from '@playwright/test';

import {
  destroyChatSession,
  openChatViaLauncher,
  openChatWindow,
  prepareDemoPage,
  sendChatMessage,
  waitForChatReady,
} from './utils';

import type {} from '../types/window';

// The host element the callback's content lands in. Scoped to `div` on purpose:
// the web-component container also emits a passthrough `<slot slot="...">` for
// each name, so an unscoped attribute selector counts every footer twice.
const REQUEST_FOOTER_SLOT = 'div[slot^="request-footer-"]';

// The chat's own wrapper, which renders for every user message whether or not a
// host filled it.
const REQUEST_FOOTER_WRAPPER = '.cds-aichat--request-footer-slot';

test.beforeEach(async ({ page }) => {
  await prepareDemoPage(page);
  await waitForChatReady(page);
  await openChatWindow(page);
});

test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

test('both footers render in one conversation', async ({ page }) => {
  // This phrase is what makes the mock backend attach a `custom_footer_slot` to
  // its reply, so the conversation carries footers in both directions at once.
  await sendChatMessage(page, 'text with custom footer');

  // The host's copy button, portaled into the outbound slot. Located by role and
  // accessible name: the button is Carbon's, so its internals are not ours to pin.
  await expect(
    page.getByRole('button', { name: 'Copy your message' }).first()
  ).toBeVisible({ timeout: 10000 });

  // And it is inside the slot the chat minted, not loose in the page.
  await expect(page.locator(REQUEST_FOOTER_SLOT).first()).toBeAttached();

  // The assistant footer the demo already rendered before this feature existed.
  await expect(
    page.locator('.cds-aichat--message-custom-footer-slot').first()
  ).toBeAttached();
});

test('a footer renders for each user message, not for replies', async ({
  page,
}) => {
  await sendChatMessage(page, 'first message');
  await sendChatMessage(page, 'second message');

  // One wrapper per user message, and each carries its own slot name.
  const filled = page.locator(REQUEST_FOOTER_SLOT);
  await expect(filled).toHaveCount(2, { timeout: 10000 });

  const slotNames = await filled.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('slot'))
  );
  expect(new Set(slotNames).size).toBe(slotNames.length);
});

test('an unfilled footer slot costs the message no height', async ({
  page,
}) => {
  await sendChatMessage(page, 'measure me');

  const wrapper = page.locator(REQUEST_FOOTER_WRAPPER).first();
  await expect(wrapper).toBeAttached();

  // Measure the whole sent column, not the wrapper alone: a margin on the
  // wrapper would not show up in its own bounding box but would still push the
  // next message down.
  const column = page.locator('.cds-aichat--sent').first();
  const filled = await column.evaluate(
    (node) => node.getBoundingClientRect().height
  );

  // Emptying the slot must return the column to the height it would have on
  // main, where no host opted in and the wrapper renders empty.
  await page.evaluate((selector) => {
    document
      .querySelectorAll(selector)
      .forEach((node) => node.parentElement?.removeChild(node));
  }, '[slot^="request-footer-"]');

  const emptied = await column.evaluate(
    (node) => node.getBoundingClientRect().height
  );

  // The wrapper is still in the DOM and still empty, and the column is back to
  // its unfooted height.
  await expect(wrapper).toBeAttached();
  expect(emptied).toBeLessThan(filled);
  await expect
    .poll(async () =>
      wrapper.evaluate((node) => node.getBoundingClientRect().height)
    )
    .toBe(0);
});

test('requests with no bubble content render no footer', async ({ page }) => {
  // The wrapper follows the bubble: a request the chat renders no bubble for
  // gets no footer either. Driven through `send` so it takes the real outbound
  // path — the one place the footer event fires.
  await page.evaluate(async () => {
    await window.chatInstance?.send({
      input: { message_type: 'text', text: '' },
    } as never);
  });

  await expect(page.locator(REQUEST_FOOTER_WRAPPER)).toHaveCount(0, {
    timeout: 10000,
  });

  // A message that does render a bubble gets one, so the absence above is the
  // gate working rather than the feature being off.
  await sendChatMessage(page, 'a message with text');
  await expect(page.locator(REQUEST_FOOTER_WRAPPER)).toHaveCount(1, {
    timeout: 10000,
  });
});

test('restart removes callback-created wrappers', async ({ page }) => {
  await sendChatMessage(page, 'before restart');
  await expect(page.locator(REQUEST_FOOTER_SLOT)).toHaveCount(1, {
    timeout: 10000,
  });

  await page.evaluate(async () => {
    await window.chatInstance?.messaging.restartConversation();
  });

  // No orphaned light-DOM children survive the restart.
  await expect(page.locator(REQUEST_FOOTER_SLOT)).toHaveCount(0, {
    timeout: 10000,
  });
});

// The web-component container renders footers on its own path — it appends the
// callback's element to its light DOM rather than portaling React into a slot.
// Step 3's proofs land here; nothing else in the repo exercises that code.
test.describe('web component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      '/?settings=%7B%22framework%22%3A%22web-component%22%2C%22layout%22%3A%22float%22%7D'
    );
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => Boolean(window.chatInstance), {
      timeout: 15000,
    });

    // The float layout starts closed. Use the tolerant helper: the outer setup
    // may already have opened the chat, in which case there is no launcher to
    // click.
    await openChatViaLauncher(page);
    await openChatWindow(page);
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible({
      timeout: 15000,
    });
  });

  test('renders a footer for each user message', async ({ page }) => {
    await sendChatMessage(page, 'first message');
    await sendChatMessage(page, 'second message');

    await expect(page.locator(REQUEST_FOOTER_SLOT)).toHaveCount(2, {
      timeout: 10000,
    });
    await expect(
      page.getByRole('button', { name: 'Copy your message' }).first()
    ).toBeVisible();
  });

  test('restart removes the wrappers it created', async ({ page }) => {
    await sendChatMessage(page, 'before restart');
    await expect(page.locator(REQUEST_FOOTER_SLOT)).toHaveCount(1, {
      timeout: 10000,
    });

    await page.evaluate(async () => {
      await window.chatInstance?.messaging.restartConversation();
    });

    await expect(page.locator(REQUEST_FOOTER_SLOT)).toHaveCount(0, {
      timeout: 10000,
    });
  });
});

const insertHistory = async (page: import('@playwright/test').Page) => {
  await page.evaluate(async () => {
    const now = new Date().toISOString();
    await window.chatInstance?.messaging.insertHistory([
      {
        message: {
          id: 'history-request-1',
          input: { message_type: 'text', text: 'a restored question' },
        },
        time: now,
      },
      {
        message: {
          id: 'history-response-1',
          output: {
            generic: [
              {
                response_type: 'text',
                text: 'a restored answer',
                message_item_options: {
                  custom_footer_slot: {
                    is_on: true,
                    slot_name: 'history-footer-1',
                    additional_data: { allow_copy: true },
                  },
                },
              },
            ],
          },
        },
        time: now,
      },
    ] as never);
  });
};

/**
 * The three restore assertions, run once per framework. React portals its content into the slot; the web-component
 * container appends the callback's element to its own light DOM instead, so the replay has to be proven on both.
 */
const restoreCases = () => {
  test('renders a footer on a restored user message', async ({ page }) => {
    await insertHistory(page);

    await expect(page.locator(REQUEST_FOOTER_SLOT)).toHaveCount(1, {
      timeout: 10000,
    });
    await expect(
      page.getByRole('button', { name: 'Copy your message' }).first()
    ).toBeVisible();
  });

  test('renders a footer on a restored assistant message', async ({ page }) => {
    await insertHistory(page);

    const host = page.locator('div[slot="history-footer-1"]').first();
    await expect(host).toBeAttached({ timeout: 10000 });

    // Assert a child element rather than text: the web-component demo fills the
    // slot with a custom element whose content lives in its own shadow root, so
    // the host's light-DOM text is empty on that path even when it is filled.
    await expect
      .poll(async () => host.evaluate((node) => node.children.length), {
        timeout: 10000,
      })
      .toBeGreaterThan(0);
  });

  test('restored and live messages both get footers', async ({ page }) => {
    await insertHistory(page);
    await expect(page.locator(REQUEST_FOOTER_SLOT)).toHaveCount(1, {
      timeout: 10000,
    });

    await sendChatMessage(page, 'a live question');

    await expect(page.locator(REQUEST_FOOTER_SLOT)).toHaveCount(2, {
      timeout: 10000,
    });
  });
};

test.describe('history', () => {
  restoreCases();
});

// Same restore assertions against the web-component container, which fills the
// slot on its own path rather than through a React portal.
test.describe('history (web component)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      '/?settings=%7B%22framework%22%3A%22web-component%22%2C%22layout%22%3A%22float%22%7D'
    );
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => Boolean(window.chatInstance), {
      timeout: 15000,
    });
    await openChatViaLauncher(page);
    await openChatWindow(page);
    await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible({
      timeout: 15000,
    });
  });

  restoreCases();
});
