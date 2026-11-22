/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { PageObjectId, type PublicConfig } from '../../../aiChatEntry';
import {
  click,
  contractChat,
  contractSetup,
  DANA,
  deferred,
  fakeDesk,
  getByTestId,
  inputField,
  typeText,
} from '../helpers/contract';

const RECONNECTING = 'Contract reconnecting to Dana';

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

describe('public agent reconnect input', () => {
  contractSetup();

  it('shows the reconnecting placeholder on a disabled input until a saved agent chat reconnects, then sends to the desk', async () => {
    const config: Partial<PublicConfig> = {
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { agent_inputPlaceholderReconnecting: RECONNECTING },
    };

    // A joined agent chat saved to the session, as before a page reload.
    const before = fakeDesk();
    const first = await contractChat({
      ...config,
      serviceDeskFactory: before.factory,
    });
    await act(() => first.instance.serviceDesk.startConversation());
    await act(() => before.callback().agentJoined(DANA));
    await waitFor(() => expect(inputField().disabled).toBe(false));
    expect(inputField().placeholder).not.toBe(RECONNECTING);
    await act(async () => first.unmount());

    const reconnect = deferred<boolean>();
    const reconnectEntered = deferred();
    const desk = fakeDesk({
      reconnect: () => {
        reconnectEntered.resolve();
        return reconnect.promise;
      },
    });
    const mount = await contractChat({
      ...config,
      serviceDeskFactory: desk.factory,
    });
    try {
      await act(() =>
        bounded(reconnectEntered.promise, 'Saved agent chat reconnect')
      );
      await waitFor(() =>
        expect(mount.instance.state.get().humanAgent.isReconnecting).toBe(true)
      );
      await waitFor(() => expect(inputField().placeholder).toBe(RECONNECTING));
      expect(inputField().disabled).toBe(true);

      await act(async () => {
        reconnect.resolve(true);
        await reconnect.promise;
      });
      await waitFor(() => expect(inputField().disabled).toBe(false));
      expect(inputField().placeholder).not.toBe(RECONNECTING);
      expect(mount.instance.state.get().humanAgent).toMatchObject({
        isReconnecting: false,
        isConnected: true,
      });

      await typeText('After reconnecting');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() =>
        expect(desk.desk.sendMessageToAgent).toHaveBeenCalledTimes(1)
      );
      expect(desk.desk.sendMessageToAgent.mock.calls[0][0].input.text).toBe(
        'After reconnecting'
      );
    } finally {
      reconnect.resolve(false);
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
