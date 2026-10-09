/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Mentions and commands, detailed behavior.
 *
 * Runs against both the React and Web Components examples. Each project
 * checks the same behavior through its own host application.
 *
 * Exercises the mention and command pickers from trigger through filtering,
 * selection, and send. Atomic deletion proves picks are chips and keeps their
 * structured data in sync. Start with the selection tests below.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
  await expect(page.getByTestId(PageObjectId.INPUT)).toHaveText('');
  await expect(page.getByRole('listbox')).toBeHidden();
});

test.describe('mentions', () => {
  test('selects a mention from suggestions and sends it in the message', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');

    // Type trigger changes as keystrokes so the picker follows the editor cursor.
    await input.pressSequentially('Hello @');
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(5);

    await input.pressSequentially('Jane');
    await expect(list.getByRole('option')).toHaveCount(1);
    await list.getByRole('option', { name: /Jane Smith/ }).click();
    await expect(input).toHaveText('Hello Jane Smith');
    await expect(list).toBeHidden();
    await expect(input).toBeFocused();

    await page.getByRole('button', { name: /send/i }).click();
    await expect(input).toHaveText('');
    await expect(
      page
        .getByTestId(PageObjectId.MAIN_PANEL)
        .getByText('Mentions: Jane Smith', {
          exact: true,
        })
    ).toBeVisible();
  });

  test('dismisses suggestion menu with Escape and keeps focus in the input', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');
    await input.pressSequentially('@');
    await expect(list).toBeVisible();
    await input.press('Escape');
    await expect(list).toBeHidden();
    await expect(input).toHaveText('@');
    await expect(input).toBeFocused();
  });

  test('reopens suggestions after backspacing an unmatched mention query', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');
    await input.pressSequentially('Hello @');
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(5);

    await input.pressSequentially('zzzz');
    await expect(input).toHaveText('Hello @zzzz');
    await expect(list).toBeHidden();
    await expect(page.getByRole('option')).toHaveCount(0);

    for (let index = 0; index < 4; index++) {
      await input.press('Backspace');
    }
    await expect(input).toHaveText('Hello @');
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(5);
  });

  test('deletes a selected mention chip in a single backspace', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');
    await input.pressSequentially('Hello @Jane');
    await expect(list.getByRole('option')).toHaveCount(1);
    await list.getByRole('option', { name: /Jane Smith/ }).click();
    await expect(list).toBeHidden();

    // Selection leaves the cursor after one space. The next Backspace deletes
    // the whole chip and restores its trigger, unlike deleting plain text.
    await input.press('Backspace');
    await input.press('Backspace');
    await expect(input).toHaveText('Hello @');
    await input.press('Backspace');
    await expect(list).toBeHidden();

    await input.pressSequentially('ordinary text');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(input).toHaveText('');
    await expect(
      page
        .getByTestId(PageObjectId.MAIN_PANEL)
        .getByText('No mentions or commands detected in structured data.', {
          exact: true,
        })
    ).toBeVisible();
  });

  test('deleting one duplicate mention keeps the remaining structured data field', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');
    await input.pressSequentially('Hello ');
    for (const expectedText of [
      'Hello Jane Smith',
      'Hello Jane Smith Jane Smith',
    ]) {
      await input.pressSequentially('@Jane');
      await list.getByRole('option', { name: /Jane Smith/ }).click();
      await expect(input).toHaveText(expectedText);
      await expect(list).toBeHidden();
    }

    // Remove the second chip from the end; the first still has a matching field.
    await input.press('Backspace');
    await input.press('Backspace');
    await expect(input).toHaveText('Hello Jane Smith @');
    await input.press('Backspace');
    await expect(list).toBeHidden();
    await page.getByRole('button', { name: /send/i }).click();
    await expect(input).toHaveText('');
    await expect(
      page
        .getByTestId(PageObjectId.MAIN_PANEL)
        .getByText('Mentions: Jane Smith', { exact: true })
    ).toBeVisible();
  });
});

test.describe('commands', () => {
  test('selects a command using keyboard navigation and sends it in the message', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');

    await input.pressSequentially('/');
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(4);
    await input.pressSequentially('summ');
    await expect(list.getByRole('option')).toHaveCount(1);
    await expect(list.getByRole('option', { name: /summarize/ })).toBeVisible();

    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(input).toHaveText('/summarize');
    await expect(list).toBeHidden();
    await expect(input).toBeFocused();

    await page.getByRole('button', { name: /send/i }).click();
    await expect(input).toHaveText('');
    await expect(
      page
        .getByTestId(PageObjectId.MAIN_PANEL)
        .getByText('Commands: /summarize', { exact: true })
    ).toBeVisible();
  });

  test('only triggers command suggestions at the beginning of a line', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');
    await input.pressSequentially('Hello /');
    await expect(input).toHaveText('Hello /');
    await expect(list).toBeHidden();

    await input.press('Shift+Enter');
    await input.pressSequentially('/');
    await expect(list).toBeVisible();
    await expect(list.getByRole('option', { name: /summarize/ })).toBeVisible();
  });

  test('reopens suggestions after backspacing an unmatched command query', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');
    await input.pressSequentially('/');
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(4);

    await input.pressSequentially('zzzz');
    await expect(input).toHaveText('/zzzz');
    await expect(list).toBeHidden();
    await expect(page.getByRole('option')).toHaveCount(0);

    for (let index = 0; index < 4; index++) {
      await input.press('Backspace');
    }
    await expect(input).toHaveText('/');
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(4);
  });

  test('deletes a selected command chip in a single backspace', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');
    await input.pressSequentially('/summ');
    await expect(list.getByRole('option')).toHaveCount(1);
    await list.getByRole('option', { name: /summarize/ }).click();
    await expect(list).toBeHidden();

    // Selection leaves the cursor after one space. The next Backspace deletes
    // the whole chip and restores its trigger, unlike deleting plain text.
    await input.press('Backspace');
    await input.press('Backspace');
    await expect(input).toHaveText('/');
    await input.press('Backspace');
    await expect(list).toBeHidden();

    await input.pressSequentially('ordinary text');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(input).toHaveText('');
    await expect(
      page
        .getByTestId(PageObjectId.MAIN_PANEL)
        .getByText('No mentions or commands detected in structured data.', {
          exact: true,
        })
    ).toBeVisible();
  });

  test('sends both command and mention together without leaking into next message', async ({
    page,
  }) => {
    const input = page.getByTestId(PageObjectId.INPUT);
    const list = page.getByRole('listbox');
    const messages = page.getByTestId(PageObjectId.MAIN_PANEL);

    await input.pressSequentially('/summ');
    await list.getByRole('option', { name: /summarize/ }).click();
    await expect(input).toHaveText('/summarize');
    await expect(list).toBeHidden();
    await input.pressSequentially('for @Jane');
    await list.getByRole('option', { name: /Jane Smith/ }).click();
    await expect(input).toHaveText('/summarize for Jane Smith');
    await expect(list).toBeHidden();

    await page.getByRole('button', { name: /send/i }).click();
    await expect(input).toHaveText('');
    await expect(
      messages.getByText('Commands: /summarize', { exact: true })
    ).toBeVisible();
    await expect(
      messages.getByText('Mentions: Jane Smith', { exact: true })
    ).toBeVisible();

    await input.pressSequentially('ordinary text');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(input).toHaveText('');
    await expect(
      messages.getByText(
        'No mentions or commands detected in structured data.',
        {
          exact: true,
        }
      )
    ).toBeVisible();
  });
});
