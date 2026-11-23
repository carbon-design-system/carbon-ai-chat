/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * The demo's own footers: its slot-visibility toggle and the green boxes it fills both footers with. The chat's
 * footer behavior (spacing, restart, history, the web-component callback) is tested in `@carbon/ai-chat`'s browser
 * tests.
 */

import { test, expect } from './fixtures';

import {
  destroyChatSession,
  openChatWindow,
  prepareDemoPage,
  sendChatMessage,
  waitForChatReady,
} from './utils';

// The host element the callback's content lands in. Scoped to `div` on purpose:
// the web-component container also emits a passthrough `<slot slot="...">` for
// each name, so an unscoped attribute selector counts every footer twice.
const REQUEST_FOOTER_SLOT = 'div[slot^="request-footer-"]';

// The chat's own wrapper, which renders for every user message whether or not a
// host filled it.
const REQUEST_FOOTER_WRAPPER = '.cds-aichat--request-footer-slot';

// A footer the demo filled with its green box. React renders the box as a div in
// the portal; the web-component demo renders a custom element whose content
// lives in its own shadow root, so neither the class nor the tag finds both.
const FILLED_REQUEST_FOOTER =
  `${REQUEST_FOOTER_SLOT} .writeable-element-external, ` +
  `${REQUEST_FOOTER_SLOT} writeable-element-example`;

// The same green box in a reply's footer. The demo names those slots
// `footer-<message id>-<item index>`.
const MESSAGE_FOOTER_SLOT = 'div[slot^="footer-"]';
const FILLED_MESSAGE_FOOTER =
  `${MESSAGE_FOOTER_SLOT} .writeable-element-external, ` +
  `${MESSAGE_FOOTER_SLOT} writeable-element-example`;

// Both footers follow the demo's slot-visibility toggle, which defaults to off.
const SHOW_SLOTS = { writeableElements: 'true' };

test.beforeEach(async ({ page }) => {
  await prepareDemoPage(page, { settings: SHOW_SLOTS });
  await waitForChatReady(page);
  await openChatWindow(page);
});

test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

test('both footers render in one conversation', async ({ page }) => {
  // With the slots shown the demo attaches a `custom_footer_slot` to every
  // reply, so any message carries footers in both directions at once.
  await sendChatMessage(page, 'any message');

  // The host's green box, portaled into the outbound slot.
  await expect(page.locator(FILLED_REQUEST_FOOTER).first()).toBeVisible({
    timeout: 10000,
  });

  // And it is inside the slot the chat minted, not loose in the page.
  await expect(page.locator(REQUEST_FOOTER_SLOT).first()).toBeAttached();

  // The reply's footer, filled with the same green box.
  await expect(page.locator(FILLED_MESSAGE_FOOTER).first()).toBeVisible({
    timeout: 10000,
  });
});

test('slot visibility off fills no footer', async ({ page }) => {
  // The demo's default. Re-navigating replaces the beforeEach page, which loaded
  // with the slots shown.
  await prepareDemoPage(page);
  await waitForChatReady(page);
  await openChatWindow(page);

  await sendChatMessage(page, 'no box please');

  // The chat still renders its wrapper for the message; the demo just hands it
  // nothing, so no host element is created.
  await expect(page.locator(REQUEST_FOOTER_WRAPPER)).toHaveCount(1, {
    timeout: 10000,
  });
  await expect(page.locator(REQUEST_FOOTER_SLOT)).toHaveCount(0);

  // Replies get no footer slot at all: the demo only attaches one with the
  // slots shown.
  await expect(
    page.locator('.cds-aichat--message-custom-footer-slot')
  ).toHaveCount(0);
});
