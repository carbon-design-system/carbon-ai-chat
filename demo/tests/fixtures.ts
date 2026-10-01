/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { test as base, expect } from '@playwright/test';

const USE_UPSERT_MESSAGE_PARAM = 'useUpsertMessage';

export interface DemoModeOptions {
  /**
   * Loads every demo page with `?useUpsertMessage`, so the mock backend sends
   * through `upsertMessage` instead of `addMessage` / `addMessageChunk`.
   */
  useAddMessage: boolean;
}

/**
 * Adds the `useUpsertMessage` flag to a `page.goto` URL. It keeps the existing
 * query string and hash as written, rather than re-serializing them through
 * `URLSearchParams`, so a spec's hand-encoded `settings` value arrives
 * unchanged.
 */
const withUseUpsertMessage = (url: string): string => {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);

  if (new URLSearchParams(query).has(USE_UPSERT_MESSAGE_PARAM)) {
    return url;
  }

  let separator = '&';
  if (queryIndex === -1) {
    separator = '?';
  } else if (query === '' || query.endsWith('&')) {
    separator = '';
  }
  return `${beforeHash}${separator}${USE_UPSERT_MESSAGE_PARAM}${hash}`;
};

/**
 * The demo's `test`. The `chromium-add-message` project sets `useAddMessage`,
 * and this fixture then adds the flag to every `page.goto`, including the
 * calls inside `prepareDemoPage`. It patches the page object itself because
 * helpers in `utils.ts` receive that same object.
 */
export const test = base.extend<DemoModeOptions>({
  useAddMessage: [false, { option: true }],
  // Named `provide`, not Playwright's usual `use`, so the React hooks lint rule
  // doesn't read it as a hook call.
  page: async ({ page, useAddMessage }, provide) => {
    if (useAddMessage) {
      const goto = page.goto.bind(page);
      page.goto = (url, options) => goto(withUseUpsertMessage(url), options);
    }
    await provide(page);
  },
});

export { expect };
