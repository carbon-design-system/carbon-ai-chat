/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Custom prompt line.
 *
 * Runs against both the React and Web Components examples. Each host fills the
 * custom prompt line slot with its own composer built from the prompt line
 * components, keeps the draft in host state, and sends it with `instance.send`.
 *
 * Checks that Enter sends the host draft and the mock echoes it, that a failed
 * send keeps the draft and shows the host's error until an edited retry
 * succeeds, and that removing the custom composer restores the built-in draft.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import type { Page } from '@playwright/test';
import { expect, openExample, test } from '../helpers';

function composer(page: Page) {
  const region = page.getByRole('region', { name: 'Custom composer' });
  return {
    editor: region.getByRole('textbox', { name: 'Your message' }),
    send: region.getByRole('button', { name: 'Send message' }),
    status: region.getByRole('status'),
    alert: region.getByRole('alert'),
  };
}

async function openComposer(page: Page) {
  await openExample(page);
  const { editor, status } = composer(page);
  await expect(editor).toBeVisible();
  // The host blocks sends with "Waiting for chat to be ready." until public
  // state reports the chat has loaded.
  await expect(status).toHaveText('');
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeHidden();
}

test('Enter sends the host draft and clears the editor', async ({ page }) => {
  await openComposer(page);
  const { editor, send } = composer(page);
  await expect(send).toBeDisabled();
  await editor.fill('hello there');
  await expect(send).toBeEnabled();
  await editor.press('Enter');
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('You sent: hello there', { exact: true })
  ).toBeVisible();
  await expect(editor).toHaveValue('');
  await expect(editor).toBeFocused();
  await expect(send).toBeDisabled();
});

test('a failed send keeps the draft until an edited retry succeeds', async ({
  page,
}) => {
  // The chat logs a send that the transport rejects. That rejection is the
  // behavior under test, so drop exactly those logs before the shared
  // fixture's clean-console check sees them.
  await page.addInitScript(() => {
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      const rejectedSend =
        String(args[0]).includes('An error occurred while sending a message') ||
        args.some(
          (arg) =>
            (arg as { errorType?: unknown } | null)?.errorType ===
            'MESSAGE_COMMUNICATION'
        );
      if (!rejectedSend) {
        original(...args);
      }
    };
  });
  await openComposer(page);
  const { editor, alert } = composer(page);
  const panel = page.getByTestId(PageObjectId.MAIN_PANEL);

  await editor.fill('fail');
  await editor.press('Enter');
  await expect(alert).toHaveText(
    'Message not sent. Your draft is saved. Try again.'
  );
  await expect(editor).toHaveValue('fail');
  await expect(editor).toBeEnabled();
  await expect(editor).toBeFocused();
  await expect(panel.getByText('You sent: fail', { exact: true })).toHaveCount(
    0
  );

  await editor.fill('fail no more');
  await editor.press('Enter');
  await expect(
    panel.getByText('You sent: fail no more', { exact: true })
  ).toBeVisible();
  await expect(alert).toHaveText('');
  await expect(editor).toHaveValue('');
});

test('removing the custom composer restores the built-in draft', async ({
  page,
}) => {
  await openComposer(page);
  const { editor } = composer(page);
  const toggle = page.getByRole('checkbox', { name: 'Use custom prompt line' });
  const builtIn = page.getByTestId(PageObjectId.INPUT);

  await toggle.uncheck();
  await expect(editor).toHaveCount(0);
  await expect(builtIn).toBeVisible();
  await builtIn.fill('built-in draft');

  await toggle.check();
  await expect(editor).toBeVisible();
  await expect(builtIn).toBeHidden();

  await toggle.uncheck();
  await expect(editor).toHaveCount(0);
  await expect(builtIn).toHaveValue('built-in draft');
});
