/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { PageObjectId } from '@carbon/ai-chat/server';
import type { Page } from '@playwright/test';

import { test, expect } from './fixtures';
import { destroyChatSession, openChatWindow, sendChatMessage } from './utils';

// Import types for window.chatInstance without emitting runtime code
import type {} from '../types/window';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The keys of the demo's `RESPONSE_MAP`, read from its source. Importing the map
 * would load the chat's browser entry into Node.
 */
const responseKeys = (): string[] => {
  const source = readFileSync(
    resolve(__dirname, '../src/customSendMessage/responseMap.ts'),
    'utf8'
  );
  const body = source.slice(source.indexOf('sortResponseMap({'));
  return [...body.matchAll(/^ {2}(?:'([^']+)'|(\w+)):/gm)].map(
    ([, quoted, bare]) => quoted ?? bare
  );
};

/** Responses that show an error on purpose. */
const ERRORS_ON_PURPOSE = new Set(['inline error']);

/**
 * With `DUMP_DOM=<directory>`, each response's settled DOM is written there, to diff
 * between two trees. Playwright empties its own output folder on every run, so the
 * directory is the caller's.
 */
const DUMP_DIR = process.env.DUMP_DOM;

/**
 * The messages list as tag names and text, through every shadow root. Times are
 * masked, so two runs at different times compare equal.
 */
const dumpMessages = (page: Page) =>
  page.evaluate(() => {
    const find = (root: ParentNode): Element | null => {
      for (const element of Array.from(root.querySelectorAll('*'))) {
        if (element.classList.contains('cds-aichat--messages')) {
          return element;
        }
        const inner = element.shadowRoot && find(element.shadowRoot);
        if (inner) {
          return inner;
        }
      }
      return null;
    };
    const lines: string[] = [];
    const walk = (root: ParentNode | null, depth: number) => {
      root?.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const value = (node.textContent ?? '')
            .replace(/\d{1,2}:\d{2}(\s?[AP]M)?/g, '<time>')
            .trim();
          if (value) {
            lines.push(`${'  '.repeat(depth)}"${value}"`);
          }
        } else if (node instanceof Element) {
          lines.push(`${'  '.repeat(depth)}<${node.tagName.toLowerCase()}>`);
          walk(node.shadowRoot, depth + 1);
          walk(node, depth + 1);
        }
      });
    };
    walk(find(document), 0);
    return lines.join('\n');
  });

/**
 * Waits until the chat's messages stop changing, so streamed, paused, and delayed
 * responses have settled.
 */
const waitForQuietMessages = async (page: Page) => {
  let last = await dumpMessages(page);
  let quietSince = Date.now();
  const deadline = Date.now() + 30_000;
  while (Date.now() - quietSince < 2000 && Date.now() < deadline) {
    await page.waitForTimeout(150);
    const now = await dumpMessages(page);
    if (now !== last) {
      last = now;
      quietSince = Date.now();
    }
  }
};

/** How many message items show the chat's own "failed to draw" error. */
const countFailedItems = (page: Page) =>
  page.evaluate(() => {
    const count = (root: ParentNode): number =>
      Array.from(root.querySelectorAll('*')).reduce(
        (total, element) =>
          total +
          (element.classList.contains('cds-aichat--message--inline-error')
            ? 1
            : 0) +
          (element.shadowRoot ? count(element.shadowRoot) : 0),
        0
      );
    return count(document);
  });

test.describe('every demo response draws', () => {
  test.afterEach(async ({ page }) => {
    await destroyChatSession(page);
  });

  const keys = responseKeys();

  test('reads the response keys', () => {
    expect(keys.length).toBeGreaterThan(30);
    expect(keys).toContain('grid');
  });

  for (const key of keys.filter((name) => !ERRORS_ON_PURPOSE.has(name))) {
    test(`draws "${key}" with no error`, async ({
      page,
      browserName,
      useAddMessage,
    }) => {
      test.skip(
        browserName !== 'chromium',
        'The corpus checks the two send modes, which chromium covers.'
      );
      test.slow();

      const reported: string[] = [];
      page.on('console', (message) => {
        if (message.text().includes('An error has occurred')) {
          reported.push(message.text());
        }
      });

      await page.route(/.*ibm-common\.js$/, (route) => route.abort());
      await page.goto('/?settings=%7B%22layout%22%3A%22float%22%7D');
      await openChatWindow(page);
      await expect(page.getByTestId(PageObjectId.MAIN_PANEL)).toBeVisible();

      await sendChatMessage(page, key);
      await waitForQuietMessages(page);

      if (DUMP_DIR) {
        const mode = useAddMessage ? 'add-message' : 'upsert';
        mkdirSync(resolve(DUMP_DIR, mode), { recursive: true });
        writeFileSync(
          resolve(DUMP_DIR, mode, `${key.replace(/[^\w-]+/g, '_')}.txt`),
          await dumpMessages(page)
        );
      }

      expect(await countFailedItems(page)).toBe(0);
      expect(reported).toEqual([]);
    });
  }
});
