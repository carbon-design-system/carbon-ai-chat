/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/** Tests markdown-plugin: mounts the chat and exercises the host's demonstrated behavior. */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { PageObjectId } from '@carbon/ai-chat/server';
import { expect, openExample, test, waitForChatReady } from '../helpers';

test.beforeEach(async ({ page }) => {
  // Serve the plugin's installed styles and fonts instead of the remote CDN.
  const require = createRequire(import.meta.url);
  const katexDist = dirname(require.resolve('katex/dist/katex.min.css'));
  await page.route(
    'https://cdn.jsdelivr.net/npm/katex@*/dist/**',
    async (route) => {
      const resource = new URL(route.request().url()).pathname.split(
        '/dist/'
      )[1];
      await route.fulfill({
        contentType: resource.endsWith('.css') ? 'text/css' : 'font/woff2',
        body: await readFile(join(katexDist, resource)),
      });
    }
  );
  await openExample(page);
  await waitForChatReady(page, PageObjectId.INPUT);
});

test('mounts with a usable prompt', async ({ page }) => {
  await expect(page.getByTestId(PageObjectId.CHAT_WIDGET)).toBeVisible();
  await expect(page.getByTestId(PageObjectId.INPUT)).toBeEditable();
});

test('renders inline and block math with the consumer stylesheet', async ({
  page,
}) => {
  // KaTeX owns this plugin output; these classes belong to the host's renderer.
  const inline = page.locator('.katex').filter({ hasText: 'E = mc^2' });
  await expect(inline).toBeVisible();
  await expect(page.locator('.katex-display')).toHaveCount(2);
  await expect(inline).toHaveCSS('font-family', /KaTeX_Main/);
  await page.getByTestId(PageObjectId.INPUT).fill('math request');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(page.locator('.katex-display')).toHaveCount(4);
});
