/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { BusEventType, PageObjectId } from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  fakeDesk,
  getByTestId,
  shownText,
} from '../helpers/contract';

describe('public header navigation event failure', () => {
  contractSetup();

  it('returns to the real home screen even when its header event handler rejects', async () => {
    const failure = new Error('Owned header navigation callback failure');
    const backend = fakeBackend({ autoResolve: true });
    const mount = await contractChat({
      openChatByDefault: true,
      homescreen: { isOn: true, greeting: 'Owned home greeting' },
      strings: { homeScreen_returnToHome: 'Return to owned home' },
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    const logged = vi.spyOn(console, 'error');
    const handler = {
      type: BusEventType.HEADER_MENU_CLICK,
      handler: async (): Promise<void> => {
        throw failure;
      },
    };
    try {
      expect(mount.instance.state.get().homeScreenState.isHomeScreenOpen).toBe(
        true
      );
      await act(() => mount.instance.messaging.send('Leave the owned home'));
      await waitFor(() =>
        expect(
          mount.instance.state.get().homeScreenState.isHomeScreenOpen
        ).toBe(false)
      );
      mount.instance.on(handler);
      await click(
        await waitFor(() => byRole('button', 'Return to owned home'))
      );
      await waitFor(() => {
        expect(
          mount.instance.state.get().homeScreenState.isHomeScreenOpen
        ).toBe(true);
        expect(
          shownText(getByTestId(PageObjectId.HOME_SCREEN_PANEL))
        ).toContain('Owned home greeting');
      });
      await waitFor(() =>
        expect(logged).toHaveBeenCalledWith(
          expect.stringContaining(BusEventType.HEADER_MENU_CLICK),
          failure
        )
      );
    } finally {
      mount.instance.off(handler);
      try {
        await act(async () => mount.unmount());
      } finally {
        logged.mockRestore();
      }
    }
  });
});

describe('public header home control during an agent request', () => {
  contractSetup();

  it('removes the return-to-home control while an agent request connects, and brings it back when the request ends', async () => {
    const home = 'Return to the owned home';
    const backend = fakeBackend({ autoResolve: true });
    const desk = fakeDesk();
    const mount = await contractChat({
      openChatByDefault: true,
      homescreen: { isOn: true, greeting: 'Owned agent home greeting' },
      strings: { homeScreen_returnToHome: home },
      serviceDeskFactory: desk.factory,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    try {
      await act(() => mount.instance.messaging.send('Leave the agent home'));
      // Positive control: the conversation offers the way home.
      await waitFor(() => expect(allByRole('button', home)).toHaveLength(1));

      await act(() => mount.instance.serviceDesk.startConversation());
      expect(mount.instance.state.get().humanAgent.isConnecting).toBe(true);
      await waitFor(() => expect(allByRole('button', home)).toHaveLength(0));

      await act(() => mount.instance.serviceDesk.endConversation());
      await waitFor(() =>
        expect(mount.instance.state.get().humanAgent.isConnecting).toBe(false)
      );
      await waitFor(() => expect(allByRole('button', home)).toHaveLength(1));
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
