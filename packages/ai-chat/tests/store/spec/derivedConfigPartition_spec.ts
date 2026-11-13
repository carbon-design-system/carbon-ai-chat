/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The values the prebuilt chat derives from its config (header, layout,
 * launcher, shortcuts, CSS overrides, and theme) live in its view partition.
 * The conversation's `config` slice holds only the public config, so a chat
 * with no view holds none of them.
 */

import { createChatSDK } from '../../../src/sdk/createChatSDK';
import { chatOf } from '../../../src/sdk/handle';
import {
  bootPrebuiltChat,
  mergePublicConfig,
} from '../../../src/chat/utils/chatBoot';
import { chatStore } from '../../../src/chat/services/attachChatView';
import { localeLoaders } from '../../../src/sdk/utils/languageUtils';
import { CarbonTheme } from '../../../src/types/config/CarbonTheme';
import { createBaseTestProps } from '../../test_helpers';

describe('derived config ownership', () => {
  it('keeps no derived values in an SDK-booted chat', async () => {
    const handle = await createChatSDK({
      messaging: { skipWelcome: true, customSendMessage: async () => {} },
    });
    const state = chatOf(handle).store.getState();

    expect(Object.keys(state.config)).toEqual(['public']);
    expect('view' in state).toBe(false);

    // A config update leaves it that way.
    await handle.updateConfig({ namespace: 'next' });
    const updated = chatOf(handle).store.getState();
    expect(Object.keys(updated.config)).toEqual(['public']);
    expect(updated.config.public.namespace).toBe('next');
    handle.destroy();
  });

  it('keeps the prebuilt chat derived values in its view partition', async () => {
    const publicConfig = mergePublicConfig({
      ...createBaseTestProps(),
      header: { title: 'Derived title' },
      layout: { showFrame: false },
      launcher: { isOn: false },
      injectCarbonTheme: CarbonTheme.G90,
      keyboardShortcuts: { messageFocusToggle: { isOn: true } },
    });
    const { serviceManager } = await bootPrebuiltChat({ publicConfig });
    const state = chatStore(serviceManager).getState();

    expect(Object.keys(state.config)).toEqual(['public']);
    const derived = state.view.derivedConfig;
    expect(derived.header.title).toBe('Derived title');
    expect(derived.header.isOn).toBe(true);
    expect(derived.layout.showFrame).toBe(false);
    expect(derived.launcher.isOn).toBe(false);
    expect(derived.themeWithDefaults.derivedCarbonTheme).toBe(CarbonTheme.G90);
    expect(derived.keyboardShortcuts.messageFocusToggle).toEqual({
      key: 'F6',
      modifiers: {},
      isOn: true,
    });
    expect(derived.cssVariableOverrides).toEqual({});
    await serviceManager.shutdown();
  });

  it('warns about invalid CSS overrides once, before the locale loads', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const loadLocale = jest.spyOn(localeLoaders, 'fr');
    try {
      const publicConfig = mergePublicConfig({
        ...createBaseTestProps(),
        locale: 'fr',
        layout: { customProperties: { '$button-primary': 'var(--brand)' } },
      });
      const { serviceManager } = await bootPrebuiltChat({ publicConfig });

      const overrideWarnings = warn.mock.calls.filter(([message]) =>
        String(message).includes('$button-primary')
      );
      expect(overrideWarnings).toHaveLength(1);
      expect(loadLocale).toHaveBeenCalledTimes(1);
      const warnOrder =
        warn.mock.invocationCallOrder[
          warn.mock.calls.indexOf(overrideWarnings[0])
        ];
      expect(warnOrder).toBeLessThan(loadLocale.mock.invocationCallOrder[0]);
      expect(
        chatStore(serviceManager).getState().view.derivedConfig
          .cssVariableOverrides['$button-primary']
      ).toBeUndefined();
      await serviceManager.shutdown();
    } finally {
      warn.mockRestore();
      loadLocale.mockRestore();
    }
  });
});
