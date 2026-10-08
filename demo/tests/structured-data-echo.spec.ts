/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * A message carrying a mention gets two replies from the mock back-end: an echo of the mention, then the normal
 * answer. Both arrive inside one `customSendMessage` call, back to back, through the selected messaging API.
 */

import type { Page } from '@playwright/test';

import { test, expect } from './fixtures';

import {
  destroyChatSession,
  openChatWindow,
  prepareDemoPage,
  waitForChatReady,
} from './utils';

// Import types for window.chatInstance without emitting runtime code
import type {} from '../types/window';

const WELCOME_TEXT = 'Welcome to this example of a custom back-end.';

// Scoped to rendered messages: the chat's live region repeats each new message's text for screen readers.
const messagesWith = (page: Page, text: string) =>
  page.getByTestId(/^message-by-index-/).filter({ hasText: text });

let pageErrors: string[];

test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await prepareDemoPage(page);
  await waitForChatReady(page);
  await openChatWindow(page);
  await expect(messagesWith(page, WELCOME_TEXT)).toHaveCount(1, {
    timeout: 10000,
  });
});

test.afterEach(async ({ page }) => {
  await destroyChatSession(page);
});

test('shows the mention echo and the answer without errors', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.chatInstance?.send({
      input: {
        text: 'hello',
        structured_data: {
          fields: [
            {
              id: 'mention_u1',
              label: 'Jane Smith',
              type: 'mention',
              value: 'u1',
            },
          ],
        },
      },
    })
  );

  await expect(messagesWith(page, 'Mentions: Jane Smith')).toHaveCount(1, {
    timeout: 10000,
  });
  // The answer to text the back-end does not recognize is the welcome text again.
  await expect(messagesWith(page, WELCOME_TEXT)).toHaveCount(2, {
    timeout: 10000,
  });
  expect(pageErrors).toEqual([]);
});
