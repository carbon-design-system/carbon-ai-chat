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
  HistoryItem,
  PublicConfigMessaging,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  WELCOME,
  changeView,
  contractChat,
  contractSetup,
  countChatReady,
  fakeBackend,
  pause,
  sendSources,
} from '../../helpers';

/**
 * Mounts a closed chat that counts `chat:ready`. The backend answers each
 * request at once unless `autoResolve` is false.
 */
async function closedChat(
  { autoResolve = true }: { autoResolve?: boolean } = {},
  messaging: Partial<PublicConfigMessaging> = {}
) {
  const backend = fakeBackend({ autoResolve });
  const ready = countChatReady();
  const { instance } = await contractChat({
    onBeforeRender: ready.onBeforeRender,
    messaging: { customSendMessage: backend.customSendMessage, ...messaging },
  });
  const sources = () => sendSources(backend);
  return { instance, backend, ready, sources };
}

// @covers event.chat:ready config.messaging.customSendMessage instance.changeView
describe('hydration on first open', () => {
  contractSetup();

  it('fires no chat:ready while closed, one after the first open, and none on a reopen', async () => {
    const { instance, ready, sources } = await closedChat();
    await pause();
    expect(ready.count()).toBe(0);
    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(ready.count()).toBe(1));
    expect(sources()).toEqual([WELCOME]);

    await changeView(instance, ViewType.LAUNCHER);
    await changeView(instance, ViewType.MAIN_WINDOW);
    await pause();
    expect(ready.count()).toBe(1);
    expect(sources()).toEqual([WELCOME]);
  });
});

// @covers instance.messaging instance.messaging.restartConversation
// @covers instance.messaging.clearConversation event.chat:ready
// @covers config.messaging.customLoadHistory state.status
describe('restart and clear on a mounted chat', () => {
  contractSetup();

  it('fires chat:ready again after a restart’s new welcome settles', async () => {
    const { instance, backend, ready } = await closedChat({
      autoResolve: false,
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await act(async () => (await backend.next()).resolve());
    await waitFor(() => expect(ready.count()).toBe(1));

    let restart: Promise<void>;
    await act(async () => {
      restart = instance.messaging.restartConversation();
    });
    const welcome = await backend.next();
    expect(ready.count()).toBe(1);
    await act(async () => {
      welcome.resolve();
      await restart;
    });
    await waitFor(() => expect(ready.count()).toBe(2));
  });

  it('leaves the welcome to the next open after a restart while closed', async () => {
    const { instance, ready, sources } = await closedChat();
    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(ready.count()).toBe(1));
    await changeView(instance, ViewType.LAUNCHER);

    await act(() => instance.messaging.restartConversation());
    await pause();
    expect(sources()).toEqual([WELCOME]);
    expect(ready.count()).toBe(1);

    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(ready.count()).toBe(2));
    expect(sources()).toEqual([WELCOME, WELCOME]);
  });

  it('still hydrates on the first open after a restart before it', async () => {
    const { instance, ready, sources } = await closedChat();
    await act(() => instance.messaging.restartConversation());
    await pause();
    expect(sources()).toEqual([]);
    expect(ready.count()).toBe(0);

    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(ready.count()).toBe(1));
    expect(sources()).toEqual([WELCOME]);
  });

  it('never hydrates after a clear before the first open', async () => {
    // Suspected bug on `main`: clearConversation marks a chat that never
    // opened as hydrated, so its first open loads no history, sends no
    // welcome, and never fires chat:ready.
    let loads = 0;
    const { instance, ready, sources } = await closedChat(
      {},
      {
        customLoadHistory: async (): Promise<HistoryItem[]> => {
          loads += 1;
          return [];
        },
      }
    );
    await act(() => instance.messaging.clearConversation());
    await changeView(instance, ViewType.MAIN_WINDOW);
    await pause(100);
    expect(loads).toBe(0);
    expect(sources()).toEqual([]);
    expect(ready.count()).toBe(0);
    expect(instance.getState().status).toBe('ready');
  });
});
