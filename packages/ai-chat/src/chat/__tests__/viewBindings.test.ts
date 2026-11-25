/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { isTestPath } from '../../../tests/architecture/helpers/isTestPath';
import fs from 'node:fs';
import path from 'node:path';
import { cleanup } from '@testing-library/react';

import type { ServiceManager } from '../../sdk/services/ServiceManager';

import { ViewType } from '../../types/state/AppState';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from './helpers/chat';

describe('a mounted chat', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('attaches its view at boot and detaches it on removal', async () => {
    const { serviceManager, instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const manager = (serviceManager.messageCoordinator as any)
      .serviceManager as ServiceManager;
    expect(manager.view.current).toBeDefined();
    await instance.changeView(ViewType.MAIN_WINDOW);
    expect(instance.getState().viewState.mainWindow).toBe(true);
    cleanup();
    await Promise.resolve();
    expect(manager.view.current).toBeUndefined();
    await expect(
      instance.changeView(ViewType.LAUNCHER)
    ).resolves.toBeUndefined();
    expect(instance.getState().viewState.mainWindow).toBe(true);
    // The other view members do nothing, and don't throw, with no view.
    expect(instance.requestFocus()).toBe(false);
    expect(() => instance.doAutoScroll()).not.toThrow();
    expect(() => instance.scrollToMessage('missing', false)).not.toThrow();
    await expect(instance.input.getEditor()).rejects.toThrow(
      'Input is not currently rendered'
    );
  });
});

describe('view handles', () => {
  it('stay off ServiceManager', () => {
    type Removed =
      | 'appWindow'
      | 'ariaAnnouncer'
      | 'getInputFunctionsRef'
      | 'inputComponent'
      | 'mainWindow'
      | 'setInputFunctionsRef'
      | 'viewService';
    // Fails to compile if ServiceManager regains any of these members.
    const none: [Extract<keyof ServiceManager, Removed>] extends [never]
      ? true
      : false = true;
    expect(none).toBe(true);
  });

  // The handles are getters, so a stray assignment fails to compile.
  it('are published only by the shell lifecycle', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(dir, entry.name);
        if (isTestPath(entry.name)) {
          return [];
        }
        if (entry.isDirectory()) {
          return walk(file);
        }
        return /\.tsx?$/.test(file) ? [file] : [];
      });
    const writers = walk(root)
      .filter((file) =>
        /\.setShellHandle\(/.test(fs.readFileSync(file, 'utf8'))
      )
      .map((file) => path.relative(root, file).replaceAll('\\', '/'));
    expect(writers).toEqual(['chat/utils/shellLifecycle.ts']);
  });
});
