/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import {
  BusEventType,
  MessageSendSource,
  PageObjectId,
  type BusEventPreSend,
  type BusEventSend,
} from '../../../aiChatEntry';
import {
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  getByTestId,
  isHidden,
  recordEvents,
  typeText,
} from '../helpers/contract';

describe('public input send surfaces', () => {
  contractSetup();

  it('reports the real home-screen input source, then the message input source after home closes', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const mount = await contractChat({
      openChatByDefault: true,
      homescreen: { isOn: true, greeting: 'Instance owner home greeting' },
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    const events = recordEvents(mount.instance, [
      BusEventType.PRE_SEND,
      BusEventType.SEND,
    ]);
    try {
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      expect(isHidden(getByTestId(PageObjectId.HOME_SCREEN_PANEL))).toBe(false);
      await typeText('From the home input');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      expect(backend.requests[0].request.input.text).toBe(
        'From the home input'
      );
      expect(backend.requests[0].options.busEventSend.source).toBe(
        MessageSendSource.HOME_SCREEN_INPUT
      );
      expect(
        events
          .of<BusEventPreSend>(BusEventType.PRE_SEND)
          .map(({ source }) => source)
      ).toEqual([MessageSendSource.HOME_SCREEN_INPUT]);
      expect(
        events.of<BusEventSend>(BusEventType.SEND).map(({ source }) => source)
      ).toEqual([MessageSendSource.HOME_SCREEN_INPUT]);
      await waitFor(() =>
        expect(
          mount.instance.state.get().homeScreenState.isHomeScreenOpen
        ).toBe(false)
      );
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      await typeText('From the message input');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() => expect(backend.requests).toHaveLength(2));
      expect(backend.requests[1].request.input.text).toBe(
        'From the message input'
      );
      expect(backend.requests[1].options.busEventSend.source).toBe(
        MessageSendSource.MESSAGE_INPUT
      );
      expect(
        events
          .of<BusEventPreSend>(BusEventType.PRE_SEND)
          .map(({ source }) => source)
      ).toEqual([
        MessageSendSource.HOME_SCREEN_INPUT,
        MessageSendSource.MESSAGE_INPUT,
      ]);
      expect(
        events.of<BusEventSend>(BusEventType.SEND).map(({ source }) => source)
      ).toEqual([
        MessageSendSource.HOME_SCREEN_INPUT,
        MessageSendSource.MESSAGE_INPUT,
      ]);
    } finally {
      events.stop();
      await act(async () => mount.unmount());
    }
  });
});
