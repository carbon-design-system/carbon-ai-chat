/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import type { Page } from '@playwright/test';
import type FileUploadItem from '@carbon/ai-chat-components/es/components/file-uploads/src/file-upload-item.js';
import type { FileStatusValue } from '@carbon/ai-chat-components/es/components/prompt-line/src/types.js';
import { test, expect } from './fixtures';
import {
  destroyChatSession,
  expectNoCspViolations,
  openChatWindow,
  prepareDemoPage,
  waitForChatReady,
} from './utils';
import type {} from '../types/window';

const FIXTURE = 'file-upload-styles-fixture';
const PARENT_CONTRAST_CSS = `
:host([invalid][size])::after { content: ""; position: absolute; inset: 0; border-radius: 0.5rem; outline: 2px solid var(--cds-support-error, #da1e28); outline-offset: -2px; pointer-events: none; }
@media screen and (prefers-contrast) { :host([invalid][size])::after { outline-style: dotted; } }
`;

async function prepare(page: Page, framework: string) {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.emulateMedia({ contrast: 'no-preference' });
  await prepareDemoPage(page, {
    settings: { framework, layout: 'fullscreen', writeableElements: 'false' },
  });
  await page.waitForFunction(() => Boolean(window.chatInstance));
  await page.evaluate(() =>
    window.setChatConfig({
      openChatByDefault: true,
      homescreen: { isOn: false },
    })
  );
  await openChatWindow(page);
  await waitForChatReady(page);
  await expect(page.locator('cds-aichat-custom-element')).toHaveCount(
    framework === 'react' ? 0 : 1
  );
  await page.waitForFunction(() =>
    Boolean(customElements.get('cds-aichat-file-upload-item'))
  );
  await page.evaluate((id) => {
    // This sibling of demo-container and its shadow children are test-owned.
    const fixture = document.createElement('section');
    fixture.id = id;
    fixture.setAttribute('aria-label', 'File upload style fixtures');
    Object.assign(fixture.style, {
      position: 'fixed',
      inset: '16px',
      zIndex: '2147483647',
      overflow: 'auto',
      background: 'white',
    });
    const root = fixture.attachShadow({ mode: 'open' });
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="blue"/></svg>';
    const imageURL = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    const uploads = [
      { kind: 'healthy', file: new File(['ok'], 'healthy.txt') },
      {
        kind: 'failed',
        file: new File(['bad'], 'failed.txt'),
        isError: true,
        errorMessage: 'The fixture upload failed.',
      },
      {
        kind: 'readonly',
        file: new File(['sent'], 'sent.txt'),
        readOnly: true,
      },
      {
        kind: 'image-file',
        file: new File([svg], 'preview.svg', { type: 'image/svg+xml' }),
      },
      {
        kind: 'image-url',
        name: 'restored.svg',
        mimeType: 'image/svg+xml',
        url: imageURL,
        readOnly: true,
      },
      {
        kind: 'video-url',
        name: 'restored.mp4',
        mimeType: 'video/mp4',
        url: 'https://web-chat.assistant.test.watson.cloud.ibm.com/unused.mp4',
        readOnly: true,
      },
      {
        kind: 'image-broken',
        name: 'broken.png',
        mimeType: 'image/png',
        url: 'data:image/png;base64,AA==',
        readOnly: true,
      },
    ];
    for (const { kind, readOnly, ...upload } of uploads) {
      const row = document.createElement('div');
      const chip = document.createElement('cds-aichat-file-upload-item');
      chip.dataset.kind = kind;
      chip.readOnly = Boolean(readOnly);
      chip.upload = {
        id: kind,
        status: 'edit' as FileStatusValue,
        ...upload,
      };
      row.append(chip);
      root.append(row);
    }
    root.append(document.createElement('div'));
    document.body.append(fixture);
  }, FIXTURE);
  await expect(page.locator(`#${FIXTURE}`)).toBeVisible();
  for (const kind of [
    'healthy',
    'failed',
    'readonly',
    'image-file',
    'image-url',
  ]) {
    await expect(
      page.locator(`#${FIXTURE} [data-kind="${kind}"]`)
    ).toBeVisible();
  }
}

async function styles(page: Page, kind: string) {
  return page
    .locator(`#${FIXTURE} [data-kind="${kind}"]`)
    .evaluate(async (chip: FileUploadItem) => {
      await chip.updateComplete;
      const inner = chip.shadowRoot.querySelector('cds-file-uploader-item');
      await inner.updateComplete;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
      const root = inner.shadowRoot;
      const status = root.querySelector('.cds--file__state-container');
      const filename = root.querySelector('.cds--file-filename');
      const requirement = root.querySelector('.cds--form-requirement');
      const outline = getComputedStyle(inner, '::after');
      return {
        gap: getComputedStyle(inner).columnGap,
        statusGap: getComputedStyle(status).columnGap,
        statusDisplay: getComputedStyle(status).display,
        nameStart: getComputedStyle(filename).marginInlineStart,
        nameEnd: getComputedStyle(filename).marginInlineEnd,
        requirementDisplay: requirement
          ? getComputedStyle(requirement).display
          : null,
        height: inner.getBoundingClientRect().height,
        padding: getComputedStyle(inner).padding,
        outline: {
          width: outline.outlineWidth,
          style: outline.outlineStyle,
          offset: outline.outlineOffset,
        },
        styles: root.querySelectorAll('style').length,
        sheets: root.adoptedStyleSheets.length,
      };
    });
}

async function addContrastReference(page: Page) {
  await page.route('**/__upload-parent-contrast.css', (route) =>
    route.fulfill({ contentType: 'text/css', body: PARENT_CONTRAST_CSS })
  );
  const ownership = await page
    .locator(`#${FIXTURE}`)
    .evaluate(async (fixture) => {
      const row = document.createElement('div');
      const chip = document.createElement('cds-aichat-file-upload-item');
      chip.dataset.kind = 'contrast-reference';
      chip.upload = {
        id: 'contrast-reference',
        file: new File(['failed'], 'contrast-reference.txt'),
        status: 'edit' as FileStatusValue,
        isError: true,
        errorMessage: 'The reference upload failed.',
      };
      row.append(chip);
      fixture.shadowRoot.append(row);
      await chip.updateComplete;
      const inner = chip.shadowRoot.querySelector('cds-file-uploader-item');
      await inner.updateComplete;
      await Promise.resolve();
      const root = inner.shadowRoot;
      const sheets = [...root.adoptedStyleSheets];
      // The transport appends its owned sheet after Carbon's sheets.
      const owned = sheets[sheets.length - 1];
      if (
        !owned ||
        !Array.from(owned.cssRules).some((rule) =>
          rule.cssText.startsWith(':host([invalid][size])::after')
        )
      ) {
        throw new Error('The reference chip has no final upload stylesheet.');
      }
      const carbonSheets = sheets.slice(0, -1);
      root.adoptedStyleSheets = carbonSheets;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = new URL('/__upload-parent-contrast.css', location.href).href;
      const loaded = new Promise<void>((resolve, reject) => {
        link.addEventListener('load', () => resolve(), { once: true });
        link.addEventListener(
          'error',
          () => reject(new Error('The reference stylesheet did not load.')),
          { once: true }
        );
      });
      root.append(link);
      await loaded;
      return {
        removed: sheets.length - root.adoptedStyleSheets.length,
        carbonPreserved: carbonSheets.every(
          (sheet, index) => root.adoptedStyleSheets[index] === sheet
        ),
      };
    });
  expect(ownership).toEqual({ removed: 1, carbonPreserved: true });
}

test.afterEach(async ({ page }) => {
  await page.evaluate((id) => document.getElementById(id)?.remove(), FIXTURE);
  await expectNoCspViolations(page);
  await destroyChatSession(page);
});

test.describe('file upload styles strict CSP', () => {
  for (const framework of ['react', 'web-component']) {
    test(`${framework} preserves editable, failed, read-only and media styles`, async ({
      page,
    }) => {
      await prepare(page, framework);
      const healthy = await styles(page, 'healthy');
      const failed = await styles(page, 'failed');
      const readOnly = await styles(page, 'readonly');
      expect(healthy.gap).toBe('16px');
      expect(healthy.statusGap).toBe('4px');
      expect(failed.gap).toBe(healthy.gap);
      expect(failed.height).toBe(healthy.height);
      expect(failed.padding).toBe('0px');
      expect(failed.requirementDisplay).toBe('none');
      expect(failed.outline).toEqual({
        width: '2px',
        style: 'solid',
        offset: '-2px',
      });
      expect(readOnly.statusDisplay).toBe('none');
      expect(readOnly.nameEnd).toBe('16px');
      expect((await styles(page, 'image-file')).nameStart).toBe('2px');
      expect((await styles(page, 'image-url')).nameStart).toBe('2px');
      for (const kind of [
        'healthy',
        'failed',
        'readonly',
        'image-file',
        'image-url',
        'video-url',
        'image-broken',
      ]) {
        expect((await styles(page, kind)).styles).toBe(0);
      }
      for (const kind of ['image-file', 'image-url']) {
        const link = page.locator(`#${FIXTURE} [data-kind="${kind}"] a`);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(link.locator('img')).toHaveJSProperty('complete', true);
        await expect(link.locator('img')).toHaveJSProperty('naturalWidth', 1);
      }
      await expect(
        page.locator(`#${FIXTURE} [data-kind="image-file"] a`)
      ).toHaveAttribute('href', /^blob:/);
      await expect(
        page.locator(`#${FIXTURE} [data-kind="image-url"] a`)
      ).toHaveAttribute('href', /^data:image\/svg\+xml,/);
      await expect(
        page.locator(`#${FIXTURE} [data-kind="video-url"] video`)
      ).toHaveCount(0);
      await expect(
        page.locator(`#${FIXTURE} [data-kind="video-url"] a`)
      ).toHaveCount(0);
      await expect(
        page.locator(`#${FIXTURE} [data-kind="image-broken"] a`)
      ).toHaveCount(0);
      expect((await styles(page, 'image-broken')).nameStart).not.toBe('2px');

      const chip = page.locator(`#${FIXTURE} [data-kind="healthy"]`);
      await page.keyboard.press('Tab');
      await chip.focus();
      expect((await styles(page, 'healthy')).outline).toEqual({
        width: '2px',
        style: 'solid',
        offset: '-2px',
      });
      await chip.evaluate((element: FileUploadItem) => element.blur());
      await addContrastReference(page);
      expect((await styles(page, 'contrast-reference')).outline).toEqual({
        width: '2px',
        style: 'solid',
        offset: '-2px',
      });
      await page.emulateMedia({ contrast: 'more' });
      expect(
        await page.evaluate(() => matchMedia('(prefers-contrast)').matches)
      ).toBe(true);
      expect((await styles(page, 'failed')).outline).toEqual(
        (await styles(page, 'contrast-reference')).outline
      );
      await page.emulateMedia({ contrast: 'no-preference' });
      expect((await styles(page, 'failed')).outline.style).toBe('solid');
      expect((await styles(page, 'contrast-reference')).outline.style).toBe(
        'solid'
      );
    });

    test(`${framework} keeps sheets owned through independent updates, moves and remounts`, async ({
      page,
    }) => {
      await prepare(page, framework);
      const result = await page
        .locator(`#${FIXTURE} [data-kind="healthy"]`)
        .evaluate(async (chip: FileUploadItem) => {
          const fixture = chip.getRootNode() as ShadowRoot;
          const other = fixture.querySelector<FileUploadItem>(
            '[data-kind="failed"]'
          );
          const innerOf = (element: FileUploadItem) =>
            element.shadowRoot.querySelector('cds-file-uploader-item');
          const settle = async (element: FileUploadItem) => {
            await element.updateComplete;
            await innerOf(element)?.updateComplete;
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve())
            );
          };
          await settle(chip);
          await settle(other);
          const inner = innerOf(chip);
          const root = inner.shadowRoot;
          const sheets = [...root.adoptedStyleSheets];
          const otherRoot = innerOf(other).shadowRoot;
          const otherRules = otherRoot.adoptedStyleSheets.map((sheet) =>
            Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n')
          );
          const sameSheets = () =>
            root.adoptedStyleSheets.length === sheets.length &&
            sheets.every(
              (sheet, index) => root.adoptedStyleSheets[index] === sheet
            );
          const upload = chip.upload;
          chip.upload = {
            ...upload,
            isError: true,
            errorMessage: 'Changed only this chip.',
          };
          await settle(chip);
          const updatedInPlace = sameSheets();
          chip.readOnly = true;
          await settle(chip);
          const readOnlyDisplay = getComputedStyle(
            root.querySelector('.cds--file__state-container')
          ).display;
          chip.readOnly = false;
          chip.upload = upload;
          await settle(chip);
          const recoveredGap = getComputedStyle(inner).columnGap;
          const independent = otherRules.every(
            (text, index) =>
              Array.from(
                otherRoot.adoptedStyleSheets[index].cssRules,
                (rule) => rule.cssText
              ).join('\n') === text
          );
          fixture.lastElementChild.append(chip);
          await settle(chip);
          const moved = sameSheets();
          const parent = chip.parentElement;
          chip.remove();
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          );
          parent.append(chip);
          await settle(chip);
          const reconnected = sameSheets();
          chip.upload = null;
          await settle(chip);
          const empty = innerOf(chip) === null;
          chip.upload = upload;
          await settle(chip);
          const replacement = innerOf(chip);
          const nextRoot = replacement.shadowRoot;
          return {
            updatedInPlace,
            readOnlyDisplay,
            recoveredGap,
            independent,
            moved,
            reconnected,
            empty,
            replacedRoot: nextRoot !== root,
            replacementSheet: nextRoot.adoptedStyleSheets.some(
              (sheet) => !sheets.includes(sheet)
            ),
            sheetCount: nextRoot.adoptedStyleSheets.length,
            originalSheetCount: sheets.length,
            uniqueSheets: new Set(nextRoot.adoptedStyleSheets).size,
            inlineStyles: nextRoot.querySelectorAll('style').length,
            restoredGap: getComputedStyle(replacement).columnGap,
          };
        });
      expect(result).toEqual({
        updatedInPlace: true,
        readOnlyDisplay: 'none',
        recoveredGap: '16px',
        independent: true,
        moved: true,
        reconnected: true,
        empty: true,
        replacedRoot: true,
        replacementSheet: true,
        sheetCount: result.originalSheetCount,
        originalSheetCount: result.originalSheetCount,
        uniqueSheets: result.originalSheetCount,
        inlineStyles: 0,
        restoredGap: '16px',
      });
      expect(result.sheetCount).toBeGreaterThan(0);
      await expect(
        page.locator(`#${FIXTURE} [data-kind="healthy"]`)
      ).toBeVisible();
      expect((await styles(page, 'failed')).outline.style).toBe('solid');
    });
  }
});
