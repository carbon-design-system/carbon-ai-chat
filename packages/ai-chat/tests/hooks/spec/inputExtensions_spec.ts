/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { InputExtensions } from '../../../src/chat/services/inputExtensions';
import {
  getBuildCarbonExtensionsIfLoaded,
  loadBuildCarbonExtensions,
} from '../../../src/chat/components/input/buildExtensionsLoader';
import type { Extension } from '@tiptap/core';

jest.mock('../../../src/chat/components/input/buildExtensionsLoader', () => ({
  getBuildCarbonExtensionsIfLoaded: jest.fn(),
  loadBuildCarbonExtensions: jest.fn(),
}));
const getBuilder = jest.mocked(getBuildCarbonExtensionsIfLoaded);
const loadBuilder = jest.mocked(loadBuildCarbonExtensions);
const config: Parameters<InputExtensions['getExtensions']>[0] = {
  mention: undefined,
  command: undefined,
  autocomplete: undefined,
  starters: undefined,
};

beforeEach(() => {
  jest.resetAllMocks();
});

it('stages host extensions without loading and preserves empty identity', () => {
  const controller = new InputExtensions();
  const host = [{} as Extension];
  const notify = jest.fn();
  controller.connect(false, notify);
  expect(controller.getExtensions(config, host, false)).toBe(host);
  const empty = controller.getExtensions(config, [], false);
  expect(controller.getExtensions(config, undefined, false)).toBe(empty);
  expect(loadBuilder).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
});

it('builds synchronously when warm, caches configs, and rebuilds changed configs', () => {
  const carbon = {} as Extension;
  const host = {} as Extension;
  const builder = jest.fn().mockReturnValue([carbon]);
  getBuilder.mockReturnValue(builder);
  const controller = new InputExtensions();
  const hosts = [host];
  const extensions = controller.getExtensions(config, hosts, true);
  expect(extensions).toEqual([carbon, host]);
  expect(controller.getExtensions({ ...config }, hosts, true)).toBe(extensions);
  expect(builder).toHaveBeenCalledTimes(1);
  controller.getExtensions({ ...config, starters: { items: [] } }, hosts, true);
  expect(builder).toHaveBeenCalledTimes(2);
  controller.connect(true, jest.fn());
  expect(loadBuilder).not.toHaveBeenCalled();
});

it('loads a cold builder and retains host identity when the curated bundle is empty', async () => {
  let resolve: (value: null) => void;
  loadBuilder.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const controller = new InputExtensions();
  const host = [{} as Extension];
  const notify = jest.fn();
  expect(controller.getExtensions(config, host, true)).toBe(host);
  controller.connect(true, notify);
  getBuilder.mockReturnValue(jest.fn().mockReturnValue([]));
  resolve(null);
  await Promise.resolve();
  expect(notify).toHaveBeenCalledTimes(1);
  expect(controller.getExtensions(config, host, true)).toBe(host);
});

it('invalidates a pending completion even after reconnecting', async () => {
  const completions: ((value: null) => void)[] = [];
  loadBuilder.mockImplementation(
    () =>
      new Promise((resolve) => {
        completions.push(resolve);
      })
  );
  const controller = new InputExtensions();
  const oldNotify = jest.fn();
  const newNotify = jest.fn();
  controller.connect(true, oldNotify);
  controller.disconnect();
  controller.disconnect();
  controller.connect(true, newNotify);
  completions[0](null);
  await Promise.resolve();
  expect(oldNotify).not.toHaveBeenCalled();
  expect(newNotify).not.toHaveBeenCalled();
  completions[1](null);
  await Promise.resolve();
  expect(newNotify).toHaveBeenCalledTimes(1);
});
