/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests the prompt-line code snippet behavior with local fixtures. */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('backticks enter a code editor and Escape returns to the prompt', async ({
  page,
}) => {
  const input = page.getByTestId(PageObjectId.INPUT);
  // Real keystrokes: the input rule and CodeMirror only react to typed input.
  await input.pressSequentially('```');
  const codeEditor = page.getByLabel('Code editor', { exact: true });
  await expect(
    page.getByText('Esc to exit code editor', { exact: true })
  ).toBeVisible();
  await expect(codeEditor).toBeFocused();
  await page.keyboard.type('const answer = 42;');
  await expect(codeEditor).toHaveText('const answer = 42;');
  await page.keyboard.press('Escape');
  await expect(input).toBeFocused();
  // Escape moves the caret into a new paragraph on the next frame; keys sent
  // before that are dropped, so wait for the caret to land there.
  await expect
    .poll(() =>
      input.evaluate((element) => {
        const root = element.getRootNode() as ShadowRoot & {
          getSelection?: () => Selection | null;
        };
        const anchor = (root.getSelection?.() ?? document.getSelection())
          ?.anchorNode;
        const anchorElement =
          anchor instanceof Element ? anchor : anchor?.parentElement;
        return Boolean(
          anchorElement &&
          element.contains(anchorElement) &&
          anchorElement.closest('p')
        );
      })
    )
    .toBe(true);
  // Keep typing without refocusing so the caret stays in the new paragraph.
  await page.keyboard.type('review this code');
  await expect(input).toContainText('review this code');
  await page.getByRole('button', { name: /send/i }).click();
  // The read-only bubble snippet is slotted host content, so it is not
  // reachable by chaining under the chat's message region.
  await expect(
    page.getByRole('textbox', { name: 'Code snippet', exact: true })
  ).toContainText('const answer = 42;');
  await expect(
    page
      .getByText('Got it — your message contained a fenced code block.', {
        exact: true,
      })
      .filter({ visible: true })
  ).toBeVisible();
  await expect(page.getByLabel('Code editor', { exact: true })).toHaveCount(0);
});
