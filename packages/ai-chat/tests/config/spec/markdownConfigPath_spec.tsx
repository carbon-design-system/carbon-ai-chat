/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import fs from 'node:fs';
import path from 'node:path';
import React, { type ReactElement } from 'react';
import { act, render } from '@testing-library/react';

import { useSelector } from '../../../src/chat/hooks/useSelector';
import {
  applyBootConfig,
  applyConfigUpdate,
  createAppliedConfig,
} from '../../../src/chat/utils/appConfigUpdates';
import { mergePublicConfig } from '../../../src/chat/utils/chatBoot';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { AppState } from '../../../src/types/state/AppState';
import { makeConfigStore, TestChatContext } from '../../test_helpers';

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(file);
    }
    return /\.tsx?$/.test(file) ? [file] : [];
  });
}

it('has one writer for the markdown settings (#1833 O5)', () => {
  const root = path.resolve(__dirname, '../../../src');
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

it('warns about a re-created markdown prop only when the host re-created it', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    const plugin = (): void => undefined;
    const markdown = { markdownItPlugins: [plugin] };
    const config: PublicConfig = { debug: true, markdown };
    const store = makeConfigStore(config);
    const serviceManager = { store } as unknown as ServiceManager;
    const applied = createAppliedConfig(mergePublicConfig(config), config);
    applyBootConfig(applied, config, serviceManager);

    // A stable markdown object with another field changed: no warning.
    applyConfigUpdate(
      applied,
      { debug: true, markdown, assistantName: 'Other' },
      serviceManager
    );
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('markdown'));

    // The same content in a new object: one warning.
    applyConfigUpdate(
      applied,
      {
        debug: true,
        markdown: { markdownItPlugins: [plugin] },
        assistantName: 'Other',
      },
      serviceManager
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`markdown`'));
  } finally {
    warn.mockRestore();
  }
});
