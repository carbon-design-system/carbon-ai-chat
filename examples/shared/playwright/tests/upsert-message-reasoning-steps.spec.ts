/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Tests: Carbon AI Chat — Reasoning steps through upsertMessage.
 *
 * Runs against both the React and Web Components examples.
 *
 * The same two reasoning formats as the streaming example, discrete steps or
 * one `reasoning.content` trace, delivered as whole-message snapshots through
 * `upsertMessage`. For each, the tests wait for the run to finish and check the
 * reasoning panel still holds the completed trace.
 * Stop tests retain the canceled trace and complete a new run in both formats.
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

for (const mode of ['Reasoning steps', 'Reasoning content']) {
  for (const phase of ['reasoning', 'answer']) {
    test(`stops ${mode.toLowerCase()} during ${phase} and completes a fresh run`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.clock.install();
      await page
        .getByRole('combobox', { name: 'Select an option', exact: true })
        .click();
      await page.getByRole('option', { name: mode, exact: true }).click();
      const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
      const stop = page.getByRole('button', {
        name: 'Stop response',
        exact: true,
      });
      await expect(stop).toBeVisible();
      if (phase === 'answer') {
        await expect(
          panel.getByText(
            mode === 'Reasoning steps'
              ? 'Reasoning steps will'
              : 'Reasoning content can',
            { exact: false }
          )
        ).toBeVisible({ timeout: 45_000 });
      } else {
        await expect(
          panel.getByText('Scanning the prompt', { exact: false })
        ).toBeVisible();
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
      await expect(oldMessage.getByRole('list').first()).toBeVisible();
      // Settle the markdown renderer's pending trailing update before recording content.
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
      // Drain the canceled run's entire schedule before checking for late writes.
      await page.clock.runFor(30_000);
      expect(await oldMessage.ariaSnapshot()).toBe(stopped);
      expect(await readSources()).toEqual(stoppedSources);
      await expect(stop).toHaveCount(0);
      await page.getByTestId(PageObjectId.INPUT).fill(mode);
      await page
        .getByRole('button', { name: 'Send message', exact: true })
        .click();
      await expect(stop).toBeVisible();
      await page.clock.runFor(30_000);
      await expect(
        panel.getByText(
          mode === 'Reasoning steps'
            ? 'This is the default behavior.'
            : 'Use this when you want a long-form rationale instead of expandable steps.',
          { exact: false }
        )
      ).toBeVisible({ timeout: 45_000 });
      await expect(stop).toHaveCount(0);
      await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
      expect(await oldMessage.ariaSnapshot()).toBe(stopped);
      expect(await readSources()).toEqual(stoppedSources);
    });
  }

  test(`retains the completed ${mode.toLowerCase()} trace`, async ({
    page,
  }) => {
    await page
      .getByRole('combobox', { name: 'Select an option', exact: true })
      .click();
    await page.getByRole('option', { name: mode, exact: true }).click();
    const panel = page.getByTestId(PageObjectId.MAIN_PANEL);
    await expect(
      panel.getByText(
        mode === 'Reasoning steps'
          ? 'This is the default behavior.'
          : 'Use this when you want a long-form rationale instead of expandable steps.',
        { exact: false }
      )
    ).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole('button', { name: /stop/i })).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Show reasoning', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Hide reasoning', exact: true })
    ).toHaveAttribute('aria-expanded', 'true');
    if (mode === 'Reasoning steps') {
      await expect(
        page.getByRole('button', { name: 'Read the user request', exact: true })
      ).toBeVisible();
      await expect(
        panel.getByText('Prepare the response', { exact: true })
      ).toBeVisible();
    } else {
      await expect(
        panel.getByText('Scanning the prompt', { exact: false })
      ).toBeVisible();
    }
  });
}
