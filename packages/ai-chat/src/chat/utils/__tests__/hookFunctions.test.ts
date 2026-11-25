/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { updateHistoryMobileDetection } from '../historyMobileDetection';

import { createAppStore } from '../../../sdk/store/appStore';

import type { AppState } from '../../../types/state/AppState';

import { viewActions } from '../../state';

vi.mock('../../../sdk/utils/browserUtils', () => ({
  IS_MOBILE: false,
}));

describe('plain hook functions', () => {
  it('preserves history open state when startClosed is set', () => {
    const state = {
      config: { public: { history: { startClosed: true } } },
      view: { historyPanelState: { isMobile: false, isOpen: true } },
    } as unknown as AppState;
    const store = createAppStore((current: AppState) => current, state);
    const dispatch = vi.spyOn(store, 'dispatch');
    const container = document.createElement('div');
    updateHistoryMobileDetection(
      { container, useCustomHostElement: true, serviceManager: { store } },
      300
    );
    expect(dispatch).toHaveBeenCalledWith(
      viewActions.setHistoryPanelOptions(true, true)
    );
    dispatch.mockClear();
    updateHistoryMobileDetection(
      { container, useCustomHostElement: true, serviceManager: { store } },
      800
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});
