/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { cleanup } from '@testing-library/react';
import {
  createBaseConfig,
  renderChatAndGetInstance,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

describe('ChatInstance.requestFocus', () => {
  beforeEach(setupBeforeEach);
  afterEach(() => {
    setupAfterEach();
    // The chat keeps its open state in session storage. Clear it so each case
    // boots with its own openChatByDefault.
    window.sessionStorage.clear();
  });

  it('should have requestFocus method available', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.requestFocus).toBe('function');
  });

  it('should execute without throwing', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => instance.requestFocus()).not.toThrow();
  });

  it('returns true when the open chat finds a place to focus', async () => {
    const instance = await renderChatAndGetInstance({
      ...createBaseConfig(),
      openChatByDefault: true,
    });

    expect(instance.requestFocus()).toBe(true);
  });

  it('returns false while the main window is closed', async () => {
    const instance = await renderChatAndGetInstance({
      ...createBaseConfig(),
      openChatByDefault: false,
    });

    expect(instance.requestFocus()).toBe(false);
  });

  it('returns false when shouldTakeFocusIfOpensAutomatically is false', async () => {
    const instance = await renderChatAndGetInstance({
      ...createBaseConfig(),
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
    });

    expect(instance.requestFocus()).toBe(false);
  });

  it('returns false after the chat unmounts', async () => {
    const instance = await renderChatAndGetInstance({
      ...createBaseConfig(),
      openChatByDefault: true,
    });
    cleanup();

    expect(instance.requestFocus()).toBe(false);
  });
});
