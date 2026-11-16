/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import { changeView, contractChat, contractSetup } from '../../helpers';

// @covers state.launcherIsExpanded state.launcherShouldStartCallToActionCounterIfEnabled
// @covers state.viewState.launcher state.viewState.mainWindow instance.changeView
// M27 keeps the enum path expanded; a partial view keeps the launcher and collapses it.
describe('launcher call to action with a partial view', () => {
  contractSetup();

  it('collapses when a partial view opens the main window while keeping the launcher', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      launcher: { desktop: { isOn: true, timeToExpand: 10 } },
    });
    await waitFor(() =>
      expect(instance.getState().launcherIsExpanded).toBe(true)
    );
    await changeView(instance, { mainWindow: true });
    await waitFor(() =>
      expect(instance.getState().launcherIsExpanded).toBe(false)
    );
    expect(instance.getState().viewState).toMatchObject({
      mainWindow: true,
      launcher: true,
    });
    expect(
      instance.getState().launcherShouldStartCallToActionCounterIfEnabled
    ).toBe(false);
  });
});
