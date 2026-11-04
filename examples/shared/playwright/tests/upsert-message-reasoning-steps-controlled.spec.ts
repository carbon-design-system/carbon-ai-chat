/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Controlled reasoning steps through upsertMessage.
 *
 * Runs against both the React and Web Components examples.
 *
 * The controlled reasoning flow, delivered through `upsertMessage` snapshots:
 * the host drives the loading label and holds the panel at `CLOSE`. The test
 * checks the label tracks the run and then clears, and that the panel opens by
 * keyboard with each step already expanded.
 * Stop tests also check that loading clears and a fresh run can finish.
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
  test(`stops controlled ${phase} and completes a fresh run`, async ({
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
    await expect(
      panel.getByText(
        phase === 'reasoning'
          ? 'Read the user request...'
          : 'This controlled reasoning',
        { exact: false }
      )
    ).toBeVisible({ timeout: 45_000 });
    const oldID = await page
      .getByTestId(/^message-by-index-/)
      .last()
      .getAttribute('data-testid');
    const oldMessage = page.getByTestId(oldID!);
    await stop.click();
    await expect(stop).toHaveCount(0);
    await expect(
      panel.getByText('Read the user request...', { exact: true })
    ).toHaveCount(0);
    await oldMessage
      .getByRole('button', { name: 'Show reasoning', exact: true })
      .click();
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
    await expect(stop).toHaveCount(0);
    await page.getByTestId(PageObjectId.INPUT).fill('Run again');
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click();
    await expect(stop).toBeVisible();
    await page.clock.runFor(30_000);
    await expect(
      panel.getByText(
        'reasoning example is set to keep all reasoning steps closed by default with a loading indicator visible instead.',
        { exact: false }
      )
    ).toBeVisible({ timeout: 45_000 });
    await expect(stop).toHaveCount(0);
    await expect(
      panel.getByText('Prepare the response...', { exact: true })
    ).toHaveCount(0);
    await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
    expect(await oldMessage.ariaSnapshot()).toBe(stopped);
    expect(await readSources()).toEqual(stoppedSources);
  });
}

test('keeps the completed controlled trace collapsed until opened', async ({
  page,
}) => {
  // The welcome's post-back button is the example's own trigger; waiting for
  // it also keeps the send from racing the welcome handshake.
  await page
    .getByRole('button', { name: 'Send a message to see example', exact: true })
    .click();
  // The host-driven loading label tracks the last step, then clears.
  const loadingLabel = page
    .getByTestId(PageObjectId.MAIN_PANEL)
    .getByText('Prepare the response...', { exact: true });
  await expect(loadingLabel).toBeVisible({ timeout: 30000 });
  await expect(
    page
      .getByTestId(PageObjectId.MAIN_PANEL)
      .getByText(
        'reasoning example is set to keep all reasoning steps closed by default with a loading indicator visible instead.',
        { exact: false }
      )
  ).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('button', { name: /stop/i })).toHaveCount(0);
  await expect(loadingLabel).toHaveCount(0);
  const show = page.getByRole('button', {
    name: 'Show reasoning',
    exact: true,
  });
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await show.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Read the user request', exact: true })
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByRole('button', { name: 'Pick a scenario', exact: true })
  ).toHaveAttribute('aria-expanded', 'true');
});
