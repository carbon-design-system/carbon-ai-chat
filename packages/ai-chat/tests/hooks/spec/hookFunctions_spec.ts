/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  getDerivedState,
  type DerivedStateOptions,
} from '../../../src/chat/utils/derivedState';
import {
  requestFocus,
  type FocusManagerOptions,
} from '../../../src/chat/utils/focusManager';
import { updateHistoryMobileDetection } from '../../../src/chat/utils/historyMobileDetection';
import {
  getWindowSize,
  observeWindowSize,
} from '../../../src/chat/utils/windowSize';
import { getCarbonTheme } from '../../../src/chat/utils/carbonTheme';
import { CarbonTheme } from '../../../src/types/config/CarbonTheme';
import { createAppStore } from '../../../src/chat/store/appStore';
import type {
  AppState,
  PersistedState,
} from '../../../src/types/state/AppState';
import actions from '../../../src/chat/store/actions';

jest.mock('../../../src/chat/utils/browserUtils', () => ({ IS_MOBILE: false }));

describe('plain hook functions', () => {
  it('gives the disclaimer priority until it is accepted for the current host', () => {
    const options: DerivedStateOptions = {
      publicConfig: {
        disclaimer: { isOn: true, disclaimerHTML: 'Terms' },
        homescreen: { isOn: true },
      },
      persistedToBrowserStorage: {
        disclaimersAccepted: {},
        homeScreenState: { isHomeScreenOpen: true },
        hasSentNonWelcomeMessage: false,
      } as PersistedState,
      isHydratingCounter: 0,
      catastrophicErrorType: null,
      viewStateMainWindow: true,
    };
    expect(getDerivedState(options, 'chat.example')).toMatchObject({
      showDisclaimer: true,
      showHomeScreen: false,
      isHydratingComplete: true,
    });
    options.persistedToBrowserStorage.disclaimersAccepted['chat.example'] =
      true;
    expect(getDerivedState(options, 'chat.example')).toMatchObject({
      showDisclaimer: false,
      showHomeScreen: true,
    });
    expect(getDerivedState(options, 'other.example').showDisclaimer).toBe(true);
  });

  it('focuses the highest-priority open panel and respects disabled auto focus', () => {
    const iframePanel = { requestFocus: jest.fn() };
    const input = { requestFocus: jest.fn() };
    const options: FocusManagerOptions = {
      shouldAutoFocus: true,
      showDisclaimer: false,
      iFramePanelIsOpen: true,
      viewSourcePanelIsOpen: false,
      customPanelIsOpen: false,
      responsePanelIsOpen: false,
      disclaimer: null,
      iframePanel,
      viewSourcePanel: null,
      customPanel: null,
      responsePanel: null,
      input,
    };
    requestFocus(options);
    expect(iframePanel.requestFocus).toHaveBeenCalledTimes(1);
    expect(input.requestFocus).not.toHaveBeenCalled();
    requestFocus({ ...options, iFramePanelIsOpen: false });
    expect(input.requestFocus).toHaveBeenCalledTimes(1);
    requestFocus({ ...options, shouldAutoFocus: false });
    expect(iframePanel.requestFocus).toHaveBeenCalledTimes(1);
  });

  it('preserves history open state when startClosed is set', () => {
    const state = {
      config: { public: { history: { startClosed: true } } },
      historyPanelState: { isMobile: false, isOpen: true },
    } as AppState;
    const store = createAppStore((current: AppState) => current, state);
    const dispatch = jest.spyOn(store, 'dispatch');
    const container = document.createElement('div');
    updateHistoryMobileDetection(
      { container, useCustomHostElement: true, serviceManager: { store } },
      300
    );
    expect(dispatch).toHaveBeenCalledWith(
      actions.setHistoryPanelOptions(true, true)
    );
    dispatch.mockClear();
    updateHistoryMobileDetection(
      { container, useCustomHostElement: true, serviceManager: { store } },
      800
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('observes the latest window size immediately and stops after cleanup', () => {
    const onChange = jest.fn();
    const stop = observeWindowSize(onChange);
    expect(onChange).toHaveBeenLastCalledWith(getWindowSize());
    window.dispatchEvent(new Event('resize'));
    expect(onChange).toHaveBeenCalledTimes(2);
    stop();
    stop();
    window.dispatchEvent(new Event('resize'));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it.each([
    [CarbonTheme.WHITE, false],
    [CarbonTheme.G10, false],
    [CarbonTheme.G90, true],
    [CarbonTheme.G100, true],
  ])('derives dark mode for %s', (theme, isDarkTheme) => {
    expect(getCarbonTheme(theme as CarbonTheme)).toEqual({
      carbonTheme: theme,
      isDarkTheme,
    });
  });
});
