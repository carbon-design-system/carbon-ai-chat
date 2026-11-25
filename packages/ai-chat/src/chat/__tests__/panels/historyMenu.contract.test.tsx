/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { BusEventType } from '../../../aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
} from '../helpers/contract';

const VIEW_CHATS = 'Owned view chats';

describe('public history header menu', () => {
  contractSetup();

  it('fires historyPanel:pre:open once from view chats while the history panel is still closed, then opens only that panel', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      history: { isOn: true },
      strings: { history_view_chats: VIEW_CHATS },
    });
    const { instance } = mount;
    const openWhenFired: boolean[] = [];
    const handler = {
      type: BusEventType.HISTORY_PANEL_PRE_OPEN,
      handler: () => {
        openWhenFired.push(instance.state.get().customPanels.history.isOpen);
      },
    };
    instance.on(handler);
    try {
      expect(instance.state.get().customPanels.history.isOpen).toBe(false);
      await click(await waitFor(() => byRole('menuitem', VIEW_CHATS)));
      await waitFor(() =>
        expect(instance.state.get().customPanels.history.isOpen).toBe(true)
      );
      expect(openWhenFired).toEqual([false]);
      expect(instance.state.get().customPanels.default.isOpen).toBe(false);
    } finally {
      instance.off(handler);
      await act(async () => mount.unmount());
    }
  });
});
