/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  InputExtensions,
  buildInputExtensions,
} from '../../../src/chat/services/inputExtensions';
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
const config: Parameters<typeof buildInputExtensions>[0] = {
  mention: undefined,
  command: undefined,
  autocomplete: undefined,
  starters: undefined,
};

beforeEach(() => {
  jest.resetAllMocks();
});

it('retains host identity and a shared empty identity without a builder', () => {
  const host = [{} as Extension];
  expect(buildInputExtensions(config, host, null)).toBe(host);
  const empty = buildInputExtensions(config, [], null);
  expect(buildInputExtensions(config, undefined, null)).toBe(empty);
});

it('prepends curated extensions and retains host identity when the bundle is empty', () => {
  const carbon = {} as Extension;
  const host = {} as Extension;
  expect(
    buildInputExtensions(config, [host], jest.fn().mockReturnValue([carbon]))
  ).toEqual([carbon, host]);
  const hosts = [host];
  expect(
    buildInputExtensions(config, hosts, jest.fn().mockReturnValue([]))
  ).toBe(hosts);
});

it('does not load when disabled or already warm', () => {
  const notify = jest.fn();
  const controller = new InputExtensions();
  controller.connect(false, notify);
  expect(controller.getBuilder(false)).toBeNull();
  getBuilder.mockReturnValue(jest.fn());
  controller.connect(true, notify);
  expect(loadBuilder).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
});

it('loads a cold builder and notifies once it resolves', async () => {
  let resolve: (value: null) => void;
  loadBuilder.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const controller = new InputExtensions();
  const notify = jest.fn();
  controller.connect(true, notify);
  resolve(null);
  await Promise.resolve();
  expect(notify).toHaveBeenCalledTimes(1);
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
