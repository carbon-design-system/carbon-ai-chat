/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, test } from '@playwright/test';
import {
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  prepareDemoPage,
  waitForChatReady,
} from './utils';

for (const { command, framework } of [
  { command: 'conversational search', framework: 'react' },
  { command: 'conversational search (stream)', framework: 'web-component' },
]) {
  test(`${command} renders interactive sources in ${framework}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepareDemoPage(page, {
      settings: { framework, layout: 'float', writeableElements: 'false' },
    });
    await openChatWindow(page);
    await waitForChatReady(page);
    await page.getByTestId(PageObjectId.INPUT).click();
    await page.keyboard.type(command);
    await page.getByTestId(PageObjectId.INPUT_SEND).click();

    const response = page.locator('.cds-aichat--conversational-search');
    const answer = response.locator('cds-aichat-conversational-search-text');
    if (command.endsWith('(stream)')) {
      await expect
        .poll(() =>
          answer.evaluate(
            (element) =>
              (element as HTMLElement & { streaming: boolean }).streaming
          )
        )
        .toBe(true);
      await expect(answer).toContainText('Carbon');
    }
    const toggle = answer.getByRole('button', {
      name: 'Open or close the list of sources',
    });
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('Sources');
    await expect
      .poll(() =>
        answer.evaluate(
          (element) =>
            (element as HTMLElement & { streaming: boolean }).streaming
        )
      )
      .toBe(false);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(answer.locator('mark')).toHaveCount(0);

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const carousel = response.locator('cds-aichat-carousel');
    await expect(carousel).toBeVisible();
    await expect(response.locator('.cds-aichat--citation-card')).toHaveCount(3);
    await expect(answer.locator('mark')).toHaveCount(1);
    const initialHighlight = await answer.locator('mark').innerText();
    await expect
      .poll(() =>
        response
          .locator('.cds-aichat--conversational-search-citations')
          .evaluate((element) => getComputedStyle(element).animationName)
      )
      .toBe('none');

    await expect(
      carousel.locator('.cds-aichat-carousel__indicator')
    ).toHaveText('1 / 3');
    await carousel
      .locator('cds-icon-button')
      .last()
      .getByRole('button')
      .click();
    await expect(answer.locator('mark')).toContainText(
      'Carbon was first recognized'
    );
    expect(await answer.locator('mark').innerText()).not.toBe(initialHighlight);

    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(carousel).toHaveCount(0);
    await expect(answer.locator('mark')).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });
}

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});
