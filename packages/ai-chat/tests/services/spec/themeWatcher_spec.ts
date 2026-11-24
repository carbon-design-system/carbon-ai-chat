/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ThemeWatcherService } from '../../../src/chat/services/ThemeWatcherService';
import { createAppStore } from '../../../src/sdk/store/appStore';
import type { AppStore } from '../../../src/sdk/store/appStore';
import { CarbonTheme } from '../../../src/types/config/CarbonTheme';
import type { AppState } from '../../../src/types/state/AppState';

type ThemeAction = { type: 'theme'; theme: CarbonTheme | null };

/** A store holding only the theme config the watcher reads. */
function themeStore(theme: CarbonTheme | null) {
  const state = (originalCarbonTheme: CarbonTheme | null) => ({
    view: {
      derivedConfig: {
        themeWithDefaults: {
          originalCarbonTheme,
          derivedCarbonTheme: originalCarbonTheme ?? CarbonTheme.WHITE,
        },
      },
    },
  });
  const store = createAppStore(
    (current, action: ThemeAction) =>
      action.type === 'theme' ? state(action.theme) : current,
    state(theme)
  );
  const setTheme = (next: CarbonTheme | null) =>
    store.dispatch({ type: 'theme', theme: next });
  return {
    store: store as unknown as AppStore<AppState>,
    setTheme,
  };
}

const watching = (watcher: ThemeWatcherService) =>
  (watcher as unknown as { isWatching: boolean }).isWatching;

describe('ThemeWatcherService.connect', () => {
  it('watches only while the config inherits the page theme, following changes', () => {
    const { store, setTheme } = themeStore(CarbonTheme.G90);
    const watcher = new ThemeWatcherService(store);

    watcher.connect();
    expect(watching(watcher)).toBe(false);

    setTheme(null);
    expect(watching(watcher)).toBe(true);

    setTheme(CarbonTheme.G10);
    expect(watching(watcher)).toBe(false);
    watcher.disconnect();
  });

  it('stops watching and following the config on disconnect', () => {
    const { store, setTheme } = themeStore(null);
    const subscribe = jest.spyOn(store, 'subscribe');
    const watcher = new ThemeWatcherService(store);

    watcher.connect();
    watcher.connect();
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(watching(watcher)).toBe(true);

    watcher.disconnect();
    expect(watching(watcher)).toBe(false);
    setTheme(CarbonTheme.G90);
    setTheme(null);
    expect(watching(watcher)).toBe(false);
  });
});
