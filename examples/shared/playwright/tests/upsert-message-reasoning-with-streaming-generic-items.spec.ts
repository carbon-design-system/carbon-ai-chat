/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Reasoning with generic items through upsertMessage.
 *
 * Runs against both the React and Web Components examples.
 *
 * Each reasoning step carries a host-rendered `user_defined` summary card, and
 * every `upsertMessage` snapshot replaces the whole message. The test opens each
 * completed step and checks it keeps exactly one card with that step's text.
 * Stop tests reject late summary and answer updates, then finish a fresh run.
 */

import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable chat surface', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

for (const phase of ['reasoning', 'answer']) {
  test(`stops generic-item ${phase} and completes a fresh run`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.clock.install();
    await page
      .getByRole('button', {
        name: 'Send a message to see example',
        exact: true,
      })
      .click();
    const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
    const stop = page.getByRole('button', {
      name: 'Stop response',
      exact: true,
    });
    await expect(stop).toBeVisible();
    if (phase === 'reasoning') {
      await expect(
        page.getByRole('button', { name: 'Read the user request', exact: true })
      ).toBeVisible();
      await expect(
        page.locator('.reasoning-summary').filter({ visible: true })
      ).toHaveCount(0);
    } else {
      await expect(
        panel.getByText('Here is the response.', { exact: false })
      ).toBeVisible({ timeout: 45_000 });
    }
    const oldID = await page
      .getByTestId(/^message-by-index-/)
      .last()
      .getAttribute('data-testid');
    const oldMessage = page.getByTestId(oldID!);
    await stop.click();
    await expect(stop).toHaveCount(0);
    const reasoning = oldMessage.getByRole('button', {
      name: 'Show reasoning',
      exact: true,
    });
    if (await reasoning.count()) {
      await reasoning.click();
    }
    await expect(
      oldMessage.getByRole('button', {
        name: 'Read the user request',
        exact: true,
      })
    ).toBeVisible();
    const readSources = () =>
      oldMessage
        .locator('cds-aichat-markdown')
        .evaluateAll((elements) =>
          elements.map(
            (element) =>
              (element as HTMLElement & { markdown: string }).markdown
          )
        );
    const stoppedSources = await readSources();
    await oldMessage
      .locator('cds-aichat-markdown')
      .evaluateAll(async (elements) => {
        await Promise.all(
          elements.map(
            (element) =>
              (element as HTMLElement & { updateComplete: Promise<boolean> })
                .updateComplete
          )
        );
      });
    const stopped = await oldMessage.ariaSnapshot();
    await page.clock.runFor(30_000);
    expect(await oldMessage.ariaSnapshot()).toBe(stopped);
    expect(await readSources()).toEqual(stoppedSources);
    if (phase === 'reasoning') {
      await expect(oldMessage.locator('.reasoning-summary')).toHaveCount(0);
    }
    await expect(stop).toHaveCount(0);
    await page.getByTestId(PageObjectId.INPUT).fill('Run again');
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click();
    await expect(stop).toBeVisible();
    await page.clock.runFor(30_000);
    await expect(
      panel.getByText('then appended a user_defined summary card.', {
        exact: false,
      })
    ).toBeVisible({ timeout: 45_000 });
    await expect(stop).toHaveCount(0);
    await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
    expect(await oldMessage.ariaSnapshot()).toBe(stopped);
    expect(await readSources()).toEqual(stoppedSources);
  });
}

test('retains one custom summary per completed reasoning step', async ({
  page,
}) => {
  // The welcome's post-back button is the example's own trigger.
  await page
    .getByRole('button', { name: 'Send a message to see example', exact: true })
    .click();
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText('then appended a user_defined summary card.', { exact: false })
  ).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('button', { name: /stop/i })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Show reasoning', exact: true })
    .click();
  for (const title of [
    'Read the user request',
    'Gather supporting context',
    'Draft the response',
  ]) {
    const step = page.getByRole('button', { name: title, exact: true });
    await step.click();
    await expect(step).toHaveAttribute('aria-expanded', 'true');
  }
  // The summary cards are host-rendered, so the example's own class is the
  // handle; each step keeps exactly one card after every snapshot replaced it.
  const summaries = page
    .locator('.reasoning-summary')
    .filter({ visible: true });
  await expect(summaries).toHaveCount(3);
  for (const summary of [
    'Detected a request for an example walkthrough.',
    'Pulled 3 supporting documents from the mock retrieval service.',
    'Drafted a 2-sentence response with inline citations.',
  ]) {
    await expect(
      summaries.filter({ hasText: summary }).getByText('Step summary', {
        exact: true,
      })
    ).toBeVisible();
  }
});
