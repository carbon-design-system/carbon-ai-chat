/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { isTestPath } from '../../../../tests/architecture/helpers/isTestPath';
import fs from 'node:fs';
import path from 'node:path';
import React, { type ReactElement } from 'react';
import { act, render } from '@testing-library/react';

import { useSelector } from '../../hooks/useSelector';
import {
  applyBootConfig,
  applyConfigUpdate,
  createAppliedConfig,
} from '../appConfigUpdates';
import { mergePublicConfig } from '../chatBoot';
import type { ServiceManager } from '../../../sdk/services/ServiceManager';
import type { PublicConfig } from '../../../types/config/PublicConfig';
import type { AppState } from '../../../types/state/AppState';
import { makeConfigStore, TestChatContext } from '../../__tests__/helpers/chat';

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (isTestPath(entry.name)) {
      return [];
    }
    if (entry.isDirectory()) {
      return sourceFiles(file);
    }
    return /\.tsx?$/.test(file) ? [file] : [];
  });
}

it('has one writer for the markdown settings (#1833 O5)', () => {
  const root = path.resolve(import.meta.dirname, '../../..');
  const writers = sourceFiles(root)
    .filter((file) =>
      /setViewValue\(\s*'markdownConfig'/.test(fs.readFileSync(file, 'utf8'))
    )
    .map((file) => path.relative(root, file).replaceAll('\\', '/'));
  expect(writers).toEqual(['chat/utils/appConfigUpdates.ts']);
});

it('applies markdown at startup and on update, and skips equal content (O5, O10)', () => {
  const plugin = (): void => undefined;
  const config: PublicConfig = { markdown: { markdownItPlugins: [plugin] } };
  const store = makeConfigStore({});
  const serviceManager = { store } as unknown as ServiceManager;
  let renders = 0;
  function MarkdownProbe(): ReactElement {
    useSelector((state: AppState) => state.view.markdownConfig);
    renders += 1;
    return null;
  }
  render(
    <TestChatContext store={store}>
      <MarkdownProbe />
    </TestChatContext>
  );
  const applied = createAppliedConfig(mergePublicConfig(config), config);

  act(() => applyBootConfig(applied, config, serviceManager));
  expect(store.getState().view.markdownConfig).toStrictEqual(config.markdown);
  expect(renders).toBe(2);

  // Same content in a new object: no write, no re-render.
  const same: PublicConfig = { markdown: { markdownItPlugins: [plugin] } };
  act(() => applyConfigUpdate(applied, same, serviceManager));
  expect(renders).toBe(2);

  const changed: PublicConfig = { markdown: { markdownItPlugins: [] } };
  act(() => applyConfigUpdate(applied, changed, serviceManager));
  expect(store.getState().view.markdownConfig).toStrictEqual(changed.markdown);
  expect(renders).toBe(3);
});
