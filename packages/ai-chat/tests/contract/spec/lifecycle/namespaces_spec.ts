/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import {
  ChatInstance,
  ViewType,
  readCarbonChatSession,
} from '../../../../src/aiChatEntry';
import {
  changeView,
  contractChat,
  contractSetup,
  recordEvents,
  showUnread,
  textResponse,
} from '../../helpers';

const CLOSED = { launcher: true, mainWindow: false };
const OPEN = { launcher: false, mainWindow: true };

/** Two chats on one page at once, under the namespaces `north` and `south`. */
async function twoChats() {
  const config = { messaging: { skipWelcome: true } };
  const north = await contractChat({ ...config, namespace: 'north' });
  const south = await contractChat({ ...config, namespace: 'south' });
  const idsOf = (instance: ChatInstance) =>
    instance.getState().messages.map(({ id }) => id);
  return {
    north: north.instance,
    south: south.instance,
    northIDs: () => idsOf(north.instance),
    southIDs: () => idsOf(south.instance),
    unmountNorth: north.unmount,
  };
}

// @covers config.namespace instance.messaging instance.messaging.addMessage
// @covers instance.messaging.restartConversation state.messages state.viewState
// @covers instance.destroySession
describe('two chats on one page with different namespaces', () => {
  contractSetup();

  it('keeps each chat’s messages and view apart', async () => {
    const chats = await twoChats();
    await changeView(chats.north, ViewType.MAIN_WINDOW);
    await act(() => chats.north.messaging.addMessage(textResponse('N', 'n1')));
    await act(() => chats.south.messaging.addMessage(textResponse('S', 's1')));
    expect(chats.northIDs()).toEqual(['n1']);
    expect(chats.southIDs()).toEqual(['s1']);
    expect(chats.north.getState().viewState).toEqual(OPEN);
    expect(chats.south.getState().viewState).toEqual(CLOSED);
  });

  it('fires one chat’s events only to its own handlers', async () => {
    const chats = await twoChats();
    const southEvents = recordEvents(chats.south);
    await changeView(chats.north, ViewType.MAIN_WINDOW);
    await act(() => chats.north.messaging.addMessage(textResponse('N', 'n1')));
    expect(southEvents.types()).toEqual([]);
  });

  it('saves each chat’s changes under its own namespace while both are mounted', async () => {
    const chats = await twoChats();
    await changeView(chats.north, ViewType.MAIN_WINDOW);
    await showUnread(chats.south);
    const north = readCarbonChatSession('north');
    const south = readCarbonChatSession('south');
    expect(north.viewState).toEqual(OPEN);
    expect(north.showUnreadIndicator).toBe(false);
    expect(south.viewState).toEqual(CLOSED);
    expect(south.showUnreadIndicator).toBe(true);
    expect(readCarbonChatSession()).toBeNull();
  });

  it('restarts one chat without touching the other’s messages', async () => {
    const chats = await twoChats();
    await act(() => chats.north.messaging.addMessage(textResponse('N', 'n1')));
    await act(() => chats.south.messaging.addMessage(textResponse('S', 's1')));
    await act(() => chats.north.messaging.restartConversation());
    expect(chats.northIDs()).toEqual([]);
    expect(chats.southIDs()).toEqual(['s1']);
  });

  it('destroys one chat’s session and leaves the other’s', async () => {
    const chats = await twoChats();
    await changeView(chats.north, ViewType.MAIN_WINDOW);
    await changeView(chats.south, ViewType.MAIN_WINDOW);
    await act(() => chats.north.destroySession());
    expect(chats.north.getState().viewState).toEqual(CLOSED);
    expect(chats.south.getState().viewState).toEqual(OPEN);
    expect(readCarbonChatSession('south').viewState).toEqual(OPEN);
  });

  it('keeps the other chat working after one unmounts', async () => {
    const chats = await twoChats();
    chats.unmountNorth();
    await act(() => chats.south.messaging.addMessage(textResponse('S', 's1')));
    await changeView(chats.south, ViewType.MAIN_WINDOW);
    expect(chats.southIDs()).toEqual(['s1']);
    expect(chats.south.getState().viewState).toEqual(OPEN);
  });
});
