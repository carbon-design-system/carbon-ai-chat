/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import { ChatInstance, ViewType } from '../../../../src/aiChatEntry';
import {
  ContractElementTag,
  FakeBackend,
  WELCOME,
  changeView,
  contractChat,
  contractElement,
  contractSetup,
  countChatReady,
  fakeBackend,
  pause,
  sendSources,
  showUnread,
  textResponse,
} from '../../helpers';

type HostName = 'ChatContainer' | ContractElementTag;

const ELEMENT_TAGS: ContractElementTag[] = [
  'cds-aichat-container',
  'cds-aichat-custom-element',
];

const HOSTS: HostName[] = ['ChatContainer', ...ELEMENT_TAGS];

/** One host's callbacks and backend, shared by every mount in a test. */
interface HostKit {
  backend: FakeBackend;
  onBeforeRender: jest.Mock;
  onAfterRender: jest.Mock;
  readyCount: () => number;
}

function hostKit(): HostKit {
  const ready = countChatReady();
  return {
    backend: fakeBackend({ autoResolve: true }),
    onBeforeRender: jest.fn(ready.onBeforeRender),
    onAfterRender: jest.fn(),
    readyCount: ready.count,
  };
}

/**
 * Mounts a chat through the named host with the kit's callbacks and backend,
 * and gives back its instance and a way to take it off the page.
 */
async function mountHost(
  host: HostName,
  kit: HostKit
): Promise<{ instance: ChatInstance; unmount: () => void }> {
  const config = {
    onBeforeRender: kit.onBeforeRender,
    onAfterRender: kit.onAfterRender,
    messaging: { customSendMessage: kit.backend.customSendMessage },
  };
  if (host === 'ChatContainer') {
    const { instance, unmount } = await contractChat(config);
    return { instance, unmount };
  }
  const { instance, remove } = await contractElement(host, {
    properties: config,
  });
  return { instance, unmount: remove };
}

/** Mounts, opens the main window, waits for chat:ready, and adds a reply. */
async function usedMount(host: HostName, kit: HostKit) {
  const mount = await mountHost(host, kit);
  await changeView(mount.instance, ViewType.MAIN_WINDOW);
  await waitFor(() => expect(kit.readyCount()).toBe(1));
  await act(() =>
    mount.instance.messaging.addMessage(textResponse('Hi', 'r1'))
  );
  return mount;
}

// @covers event.chat:ready state.messages state.hasSentNonWelcomeMessage
// @covers config.messaging.customSendMessage
describe.each(HOSTS)('unmount and remount of %s', (host) => {
  contractSetup();

  it('runs both render callbacks and fires chat:ready again', async () => {
    const kit = hostKit();
    const first = await usedMount(host, kit);
    first.unmount();
    await mountHost(host, kit);
    expect(kit.onBeforeRender).toHaveBeenCalledTimes(2);
    expect(kit.onAfterRender).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(kit.readyCount()).toBe(2));
  });

  it('restores the saved flags, but not the messages', async () => {
    const kit = hostKit();
    const first = await usedMount(host, kit);
    expect(first.instance.getState().hasSentNonWelcomeMessage).toBe(true);
    first.unmount();
    const { instance } = await mountHost(host, kit);
    expect(instance.getState().hasSentNonWelcomeMessage).toBe(true);
    expect(instance.getState().messages.map(({ id }) => id)).not.toContain(
      'r1'
    );
    await waitFor(() => expect(kit.backend.requests).toHaveLength(2));
    await waitFor(() => expect(kit.readyCount()).toBe(2));
    const state = instance.getState();
    expect(state.hasSentNonWelcomeMessage).toBe(true);
    // The restored open window hydrates again, so its only message is a
    // new welcome request.
    expect(sendSources(kit.backend)).toEqual([WELCOME, WELCOME]);
    expect(state.messages.map(({ id }) => id)).toEqual([
      kit.backend.requests[1].request.id,
    ]);
  });

  it('hydrates a remount of a closed chat only when it opens', async () => {
    const kit = hostKit();
    const first = await mountHost(host, kit);
    await showUnread(first.instance);
    first.unmount();
    const { instance } = await mountHost(host, kit);
    await pause();
    expect(instance.getState().showUnreadIndicator).toBe(true);
    expect(kit.readyCount()).toBe(0);
    expect(sendSources(kit.backend)).toEqual([]);

    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(kit.readyCount()).toBe(1));
    expect(sendSources(kit.backend)).toEqual([WELCOME]);
  });
});

// @covers state.viewState
describe.each(ELEMENT_TAGS)('unmount and remount of %s, view state', (tag) => {
  contractSetup();

  it('restores the open main window', async () => {
    const kit = hostKit();
    const first = await usedMount(tag, kit);
    first.unmount();
    const { instance } = await mountHost(tag, kit);
    await waitFor(() => expect(kit.readyCount()).toBe(2));
    expect(instance.getState().viewState).toEqual({
      launcher: false,
      mainWindow: true,
    });
  });
});

// @covers event.chat:ready state.messages state.viewState
describe.each(ELEMENT_TAGS)('removing and adding back the same %s', (tag) => {
  contractSetup();

  it('starts a new chat: both render callbacks and chat:ready again, without the old messages', async () => {
    const kit = hostKit();
    const config = {
      onBeforeRender: kit.onBeforeRender,
      onAfterRender: kit.onAfterRender,
      messaging: { customSendMessage: kit.backend.customSendMessage },
    };
    const { instance, element } = await contractElement(tag, {
      properties: config,
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(kit.readyCount()).toBe(1));
    await act(() => instance.messaging.addMessage(textResponse('Hi', 'r1')));

    // A removal that outlasts the task releases the chat.
    await act(async () => {
      element.remove();
    });
    await pause();
    await act(async () => {
      document.body.appendChild(element);
    });
    await waitFor(() => expect(kit.onAfterRender).toHaveBeenCalledTimes(2));
    expect(kit.onBeforeRender).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(kit.readyCount()).toBe(2));
    const current: ChatInstance = kit.onBeforeRender.mock.calls[1][0];
    expect(current.getState().viewState).toEqual({
      launcher: false,
      mainWindow: true,
    });
    expect(current.getState().messages.map(({ id }) => id)).toEqual([
      kit.backend.requests[1].request.id,
    ]);
  });
});
