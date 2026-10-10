/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests markdown-override: mounts the chat and exercises the host's demonstrated behavior. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await page.route('https://news-cdn.softpedia.com/**', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=',
        'base64'
      ),
    })
  );
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('keeps custom tables, transformed links, and actionable checkboxes', async ({
  page,
}) => {
  await expect(page.getByRole('table')).toHaveCount(2);
  await expect(
    page.getByRole('cell', { name: 'Scheduler', exact: true })
  ).toBeVisible();
  const link = page.getByRole('link', {
    name: 'Carbon Design System',
    exact: true,
  });
  await expect(link).toHaveAttribute(
    'href',
    'https://carbondesignsystem.com/?utm_source=ai-chat'
  );
  await expect(link).toHaveAttribute('target', '_self');
  // Only the welcome reply has a checklist until another request is sent.
  const checkbox = page.getByRole('checkbox', {
    name: 'Review the design',
    exact: true,
  });
  await checkbox.focus();
  await checkbox.press('Space');
  await expect(checkbox).toBeChecked();
  await page.getByTestId(PageObjectId.INPUT).fill('another markdown request');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(page.getByRole('table')).toHaveCount(4);
});

// Observed: toggling "Review the design" in the welcome also checks it in every
// later reply, because checklist ids are source lines shared across messages.
test.fixme('keeps checklist state per message across a new reply', async ({
  page,
}) => {
  const reviewItem = (checked: boolean) =>
    page.getByRole('checkbox', {
      name: 'Review the design',
      exact: true,
      checked,
    });
  await reviewItem(false).focus();
  await reviewItem(false).press('Space');
  await expect(reviewItem(true)).toHaveCount(1);
  await page.getByTestId(PageObjectId.INPUT).fill('another markdown request');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(page.getByRole('table')).toHaveCount(4);
  await expect(reviewItem(true)).toHaveCount(1);
  await expect(reviewItem(false)).toHaveCount(1);
});
