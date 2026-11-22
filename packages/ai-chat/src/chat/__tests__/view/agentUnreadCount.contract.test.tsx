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
  HumanAgentMessageType,
  PageObjectId,
  ViewType,
  type MessageResponse,
} from '../../../aiChatEntry';
import {
  accessibleName,
  changeView,
  contractChat,
  contractSetup,
  DANA,
  fakeDesk,
  getByTestId,
  pause,
} from '../helpers/contract';

const CLOSED_NAME = 'Open the owned chat';
const ONE_UNREAD = `${CLOSED_NAME}. 1 owned unread`;

function launcherName(): string {
  return accessibleName(getByTestId(PageObjectId.LAUNCHER));
}

describe('public agent unread count', () => {
  contractSetup();

  it('counts agent messages, but not the chat-ended note, that arrive while the window is closed on the launcher, and clears them on open or a new agent request', async () => {
    const desk = fakeDesk();
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      serviceDeskFactory: desk.factory,
      strings: {
        launcher_isClosed: CLOSED_NAME,
        icon_ariaUnreadMessages: '{count} owned unread',
      },
    });
    try {
      // Joined while open, so the joined note is read.
      await act(async () => {
        await mount.instance.serviceDesk.startConversation();
        await desk.callback().agentJoined(DANA);
      });
      await changeView(mount.instance, ViewType.LAUNCHER);
      await waitFor(() => expect(launcherName()).toBe(CLOSED_NAME));

      await act(() =>
        desk.callback().sendMessageToUser('First reply while closed')
      );
      await waitFor(() => expect(launcherName()).toBe(ONE_UNREAD));

      // Opening the main window reads it.
      await changeView(mount.instance, ViewType.MAIN_WINDOW);
      await changeView(mount.instance, ViewType.LAUNCHER);
      await waitFor(() => expect(launcherName()).toBe(CLOSED_NAME));

      await act(() =>
        desk.callback().sendMessageToUser('Second reply while closed')
      );
      await waitFor(() => expect(launcherName()).toBe(ONE_UNREAD));

      // The chat-ended note doesn't count as unread.
      await act(() => mount.instance.serviceDesk.endConversation());
      expect(mount.instance.state.get().humanAgent.isConnected).toBe(false);
      expect(
        mount.instance.state
          .get()
          .messages.some(
            (message) =>
              'output' in message &&
              (message as MessageResponse).output.generic.some(
                (item) =>
                  item.agent_message_type ===
                  HumanAgentMessageType.CHAT_WAS_ENDED
              )
          )
      ).toBe(true);
      await pause();
      expect(launcherName()).toBe(ONE_UNREAD);

      // A new agent request clears what the last conversation left unread.
      await act(() => mount.instance.serviceDesk.startConversation());
      expect(mount.instance.state.get().humanAgent.isConnecting).toBe(true);
      await waitFor(() => expect(launcherName()).toBe(CLOSED_NAME));
    } finally {
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
