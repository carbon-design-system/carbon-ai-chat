/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import Add16 from '@carbon/icons/es/add--large/16.js';
import type { StructuredData } from '@carbon/ai-chat';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  prepareDemoPage,
  waitForChatReady,
} from './utils';
import type {} from '../types/window';

type UploadProbeWindow = Window & {
  inputActionsUpload: {
    calls: { name: string; type: string; size: number; aborted: boolean }[];
    complete(): void;
  };
};

async function prepare(page: Page, framework: string, expanded: boolean) {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepareDemoPage(page, {
    settings: {
      framework,
      layout: 'fullscreen',
      direction: framework === 'react' ? 'ltr' : 'rtl',
      writeableElements: 'false',
    },
  });
  await page.waitForFunction(
    () =>
      window.chatInstance?.serviceManager.store.getState()
        .initialViewChangeComplete
  );
  await page.evaluate(
    async ({ expanded, icon }) => {
      const probe: UploadProbeWindow['inputActionsUpload'] = {
        calls: [],
        complete: () => undefined,
      };
      (window as UploadProbeWindow).inputActionsUpload = probe;
      await window.setChatConfig({
        openChatByDefault: true,
        homescreen: { isOn: false },
        input: {
          expanded,
          isDisabled: false,
          actions: [{ id: 'other', text: 'Other action', icon }],
        },
        upload: {
          isOn: true,
          accept: '.txt',
          maxFiles: 1,
          onFileUpload: (file, signal) => {
            probe.calls.push({
              name: file.name,
              type: file.type,
              size: file.size,
              aborted: signal.aborted,
            });
            return new Promise<StructuredData>((resolve) => {
              probe.complete = () =>
                resolve({ user_defined: { uploaded: file.name } });
            });
          },
        },
      });
    },
    { expanded, icon: Add16 }
  );
  await openChatWindow(page);
  await waitForChatReady(page);
  await expect(page.locator('cds-aichat-custom-element')).toHaveCount(
    framework === 'react' ? 0 : 1
  );
}

async function chooseUploadAction(page: Page, expanded: boolean) {
  const actions = page.locator('cds-aichat-prompt-line-shell');
  if (expanded) {
    await actions
      .getByRole('button', { name: 'Add files to upload', exact: true })
      .click();
  } else {
    await actions.getByTestId('cds-aichat-input-actions-trigger').click();
    await actions
      .getByRole('menuitem', { name: 'Add files to upload', exact: true })
      .click();
    await expect(actions.locator('cds-menu')).toHaveCount(0);
  }
}

test.afterEach(async ({ page }) => {
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

for (const framework of ['react', 'web-component']) {
  for (const expanded of [false, true]) {
    test(`${framework} ${expanded ? 'expanded' : 'compact'} upload action keeps file selection, pending state, and the upload limit`, async ({
      page,
    }) => {
      await prepare(page, framework, expanded);
      const fileInput = page.locator(
        'cds-aichat-prompt-line-shell input[type="file"]'
      );
      await expect(fileInput).toHaveAttribute('accept', '.txt');
      await expect(fileInput).toBeEnabled();
      let chooserCount = 0;
      page.on('filechooser', () => {
        chooserCount += 1;
      });
      const chooser = page.waitForEvent('filechooser');
      await chooseUploadAction(page, expanded);
      const payload = Buffer.from('Native actions upload');
      const filename = `${framework}-${expanded ? 'expanded' : 'compact'}.txt`;
      await (
        await chooser
      ).setFiles({ name: filename, mimeType: 'text/plain', buffer: payload });
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as UploadProbeWindow).inputActionsUpload.calls
          )
        )
        .toEqual([
          {
            name: filename,
            type: 'text/plain',
            size: payload.length,
            aborted: false,
          },
        ]);
      await expect
        .poll(() =>
          page.evaluate(
            () => window.chatInstance.getState().input.hasInFlightUploads
          )
        )
        .toBe(true);
      const remove = page.getByRole('button', {
        name: `Remove ${filename}`,
        exact: true,
      });
      await expect(
        page.getByRole('group', { name: filename, exact: true })
      ).toBeVisible();
      await expect(remove).toHaveCount(0);
      await expect(fileInput).toBeDisabled();

      await chooseUploadAction(page, expanded);
      expect(chooserCount).toBe(1);
      expect(
        await page.evaluate(
          () => (window as UploadProbeWindow).inputActionsUpload.calls.length
        )
      ).toBe(1);

      await page.evaluate(() =>
        (window as UploadProbeWindow).inputActionsUpload.complete()
      );
      await expect
        .poll(() =>
          page.evaluate(
            () => window.chatInstance.getState().input.hasInFlightUploads
          )
        )
        .toBe(false);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              window.chatInstance.getState().input.structuredData?.user_defined
          )
        )
        .toEqual({ uploaded: filename });
      await expect(remove).toBeVisible();
      await expect(fileInput).toBeDisabled();
      await remove.click();
      await expect(remove).toHaveCount(0);
      await expect(fileInput).toBeEnabled();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              window.chatInstance.getState().input.structuredData?.user_defined
                ?.uploaded ?? null
          )
        )
        .toBeNull();
    });
  }
}
