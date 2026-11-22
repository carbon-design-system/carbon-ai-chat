// @vitest-environment jsdom
// happy-dom 21 does not retarget event.target out of shadow roots, which the chat's React handlers need.
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
  ScreenShareState,
  type PublicConfig,
  type ServiceDesk,
  type ServiceDeskCallback,
} from '../../../aiChatEntry';
import {
  DANA,
  allByRole,
  shownText,
  byRole,
  click,
  contractChat,
  contractSetup,
  isShownWithin,
} from '../helpers/contract';

const TITLE = 'Share this screen with the support agent?';
const ACCEPT = 'Allow this screen share';
const DECLINE = 'Keep this screen private';
const STOP = 'End this screen share';

function integration() {
  let callback: ServiceDeskCallback;
  let stops = 0;
  const factory: NonNullable<PublicConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    const desk: ServiceDesk = {
      getName: () => 'Mounted screen-share desk',
      startChat: async () => undefined,
      endChat: async () => undefined,
      sendMessageToAgent: async () => undefined,
      screenShareStop: async () => {
        stops += 1;
      },
    };
    return desk;
  };
  return {
    factory,
    get callback() {
      return callback;
    },
    get stops() {
      return stops;
    },
  };
}

describe('public host screen-share consent', () => {
  contractSetup();

  it('answers real desk requests through its configured consent controls and stops an accepted share', async () => {
    const desk = integration();
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      serviceDeskFactory: desk.factory,
      strings: {
        agent_sharingRequestTitle: TITLE,
        agent_sharingAcceptButton: ACCEPT,
        agent_sharingDeclineButton: DECLINE,
        agent_sharingStopSharingButton: STOP,
      },
    });
    const requests: Promise<ScreenShareState>[] = [];
    try {
      await act(() => mount.instance.serviceDesk.startConversation());
      await act(() => desk.callback.agentJoined(DANA));
      await act(async () => {
        requests.push(desk.callback.screenShareRequest());
      });
      const first = await waitFor(() => byRole('dialog', TITLE));
      // Header close and footer decline share a name; select the visibly labelled action.
      const declines = await waitFor(() => {
        const controls = allByRole('button', DECLINE).filter(
          (control) =>
            isShownWithin(control, first) &&
            shownText(control).trim() === DECLINE
        );
        expect(controls).toHaveLength(1);
        return controls;
      });
      expect(isShownWithin(declines[0], first)).toBe(true);
      await click(declines[0]);
      await expect(requests[0]).resolves.toBe(ScreenShareState.DECLINED);
      expect(mount.instance.state.get().humanAgent.isScreenSharing).toBe(false);
      await act(async () => {
        requests.push(desk.callback.screenShareRequest());
      });
      const second = await waitFor(() => byRole('dialog', TITLE));
      const accept = byRole('button', ACCEPT);
      expect(isShownWithin(accept, second)).toBe(true);
      await click(accept);
      await expect(requests[1]).resolves.toBe(ScreenShareState.ACCEPTED);
      expect(mount.instance.state.get().humanAgent.isScreenSharing).toBe(true);
      await click(await waitFor(() => byRole('button', STOP)));
      await waitFor(() => expect(desk.stops).toBe(1));
      expect(mount.instance.state.get().humanAgent.isScreenSharing).toBe(false);
    } finally {
      try {
        await act(() => desk.callback.screenShareEnded());
        await act(() => mount.instance.serviceDesk.endConversation());
        await Promise.allSettled(requests);
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
