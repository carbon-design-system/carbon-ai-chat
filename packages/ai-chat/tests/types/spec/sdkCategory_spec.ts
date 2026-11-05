/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Everything an SDK host can reach is tagged `@category SDK`, so one docs page holds the whole
 * surface (ADR-0002). A shared type keeps its other categories and gains this one. Reads source, so
 * it needs no docs build.
 */

import { SDK_ROOTS, categories, sdkSurface } from '../helpers/sdkSurface';

const surface = sdkSurface();
const names = new Set(surface.map(({ name }) => name));

it('starts from every SDK root', () => {
  for (const root of SDK_ROOTS) {
    expect(names.has(root)).toBe(true);
  }
});

it('stops at the conversation, without reaching the prebuilt chat', () => {
  for (const name of [
    'ChatInstance',
    'ChatInstanceMessaging',
    'PublicChatState',
    'PublicConfig',
    'PublicConfigMessaging',
    'OnErrorData',
    'ServiceDeskPublicConfig',
    'PersistedStateConfig',
  ]) {
    expect(names.has(name)).toBe(false);
  }
});

it('tags every reachable exported type with @category SDK', () => {
  const missing = surface
    .filter(({ pairedType }) => !pairedType)
    .filter(({ node }) => !categories(node).includes('SDK'))
    .map(({ name, file }) => `${name} (${file})`);
  expect([...new Set(missing)].sort()).toEqual([]);
});
