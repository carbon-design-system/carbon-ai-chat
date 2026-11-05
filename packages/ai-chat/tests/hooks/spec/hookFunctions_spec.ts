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
import { createAppStore } from '../../../src/shared/store/appStore';
import type {
  AppState,
  PersistedState,
} from '../../../src/types/state/AppState';
import actions from '../../../src/shared/store/actions';

jest.mock('../../../src/shared/utils/browserUtils', () => ({
  IS_MOBILE: false,
}));

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

  it('returns whether each branch found a place to focus', () => {
    const closed: FocusManagerOptions = {
      shouldAutoFocus: true,
      showDisclaimer: false,
      iFramePanelIsOpen: false,
      viewSourcePanelIsOpen: false,
      customPanelIsOpen: false,
      responsePanelIsOpen: false,
      disclaimer: null,
      iframePanel: null,
      viewSourcePanel: null,
      customPanel: null,
      responsePanel: null,
      input: null,
    };
    const found = { requestFocus: jest.fn(() => true) };
    const missed = { requestFocus: jest.fn(() => false) };
    expect(requestFocus({ ...closed, input: found })).toBe(true);
    expect(requestFocus({ ...closed, input: missed })).toBe(false);
    expect(requestFocus(closed)).toBe(false);
    expect(
      requestFocus({ ...closed, customPanelIsOpen: true, customPanel: found })
    ).toBe(true);
    expect(
      requestFocus({
        ...closed,
        responsePanelIsOpen: true,
        responsePanel: null,
      })
    ).toBe(false);
    expect(
      requestFocus({ ...closed, shouldAutoFocus: false, input: found })
    ).toBe(false);
    const thrown = {
      requestFocus: jest.fn(() => {
        throw new Error('focus failed');
      }),
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(requestFocus({ ...closed, input: thrown })).toBe(false);

    const disclaimer = document.createElement('button');
    document.body.appendChild(disclaimer);
    expect(requestFocus({ ...closed, showDisclaimer: true, disclaimer })).toBe(
      true
    );
    expect(document.activeElement).toBe(disclaimer);
    expect(
      requestFocus({ ...closed, showDisclaimer: true, disclaimer: null })
    ).toBe(false);
    disclaimer.remove();
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
