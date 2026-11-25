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
  PageObjectId,
  type MessageRequest,
  type PublicConfig,
  type ServiceDesk,
  type ServiceDeskCallback,
} from '../../../aiChatEntry';
import {
  DANA,
  byRole,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  isHidden,
  isShownWithin,
  typeText,
} from '../helpers/contract';

function gate() {
  let resolve: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('public host service-desk actions', () => {
  contractSetup();

  it('leaves the visible home screen when a direct public start exposes the actual connecting control', async () => {
    let starts = 0;
    let ends = 0;
    const factory: NonNullable<
      PublicConfig['serviceDeskFactory']
    > = async () => {
      const desk: ServiceDesk = {
        getName: () => 'Home-start contract desk',
        startChat: async () => {
          starts += 1;
        },
        endChat: async () => {
          ends += 1;
        },
        sendMessageToAgent: async () => undefined,
      };
      return desk;
    };
    const mount = await contractChat({
      openChatByDefault: true,
      homescreen: { isOn: true, greeting: 'Agent start home control' },
      messaging: { skipWelcome: true },
      serviceDeskFactory: factory,
      strings: {
        agent_connectButtonCancel: 'Cancel this agent request',
        agent_confirmCancelRequestTitle: 'Cancel the pending agent connection?',
        agent_confirmCancelRequestYes: 'Confirm this cancellation',
      },
    });
    try {
      expect(isHidden(getByTestId(PageObjectId.HOME_SCREEN_PANEL))).toBe(false);
      expect(mount.instance.state.get().homeScreenState.isHomeScreenOpen).toBe(
        true
      );
      await act(() => mount.instance.serviceDesk.startConversation());
      expect(starts).toBe(1);
      expect(mount.instance.state.get().homeScreenState.isHomeScreenOpen).toBe(
        false
      );
      expect(mount.instance.state.get().humanAgent.isConnecting).toBe(true);
      await click(
        await waitFor(() => byRole('button', 'Cancel this agent request'))
      );
      const confirmation = await waitFor(() =>
        byRole('dialog', 'Cancel the pending agent connection?')
      );
      const confirm = await waitFor(() =>
        byRole('button', 'Confirm this cancellation')
      );
      expect(isShownWithin(confirm, confirmation)).toBe(true);
      await click(confirm);
      await waitFor(() => expect(ends).toBe(1));
      expect(mount.instance.state.get().humanAgent.isConnecting).toBe(false);
    } finally {
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('keeps a real composer-to-agent send running when programmatic Stop has no assistant turn to stop', async () => {
    let callback: ServiceDeskCallback;
    const release = gate();
    const returned: Promise<void>[] = [];
    const sent: MessageRequest[] = [];
    const assistant: string[] = [];
    const factory: NonNullable<PublicConfig['serviceDeskFactory']> = async (
      parameters
    ) => {
      callback = parameters.callback;
      const desk: ServiceDesk = {
        getName: () => 'Agent send ownership desk',
        startChat: async () => undefined,
        endChat: async () => undefined,
        sendMessageToAgent: (message) => {
          sent.push(message);
          const work = release.promise.then((): void => undefined);
          returned.push(work);
          return work;
        },
      };
      return desk;
    };
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        customSendMessage: (request): void => {
          assistant.push(request.input.text);
        },
      },
      serviceDeskFactory: factory,
    });
    try {
      // The same actual composer/assistant recorder works before the agent joins.
      await typeText('Assistant routing control');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() =>
        expect(assistant).toEqual(['Assistant routing control'])
      );
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      await act(() => mount.instance.serviceDesk.startConversation());
      await act(() => callback.agentJoined(DANA));
      await typeText('Keep this desk send running');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0].input.text).toBe('Keep this desk send running');
      expect(mount.instance.state.get().status).toBe('submitted');
      await act(() => mount.instance.messaging.stop());
      expect(mount.instance.state.get().status).toBe('submitted');
      expect(assistant).toEqual(['Assistant routing control']);
      expect(sent).toHaveLength(1);
      await act(async () => {
        release.resolve();
        await Promise.all(returned);
      });
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      expect(mount.instance.state.get().messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: sent[0].id,
            input: expect.objectContaining({
              text: 'Keep this desk send running',
            }),
          }),
        ])
      );
    } finally {
      release.resolve();
      try {
        await act(async () => {
          await Promise.allSettled(returned);
          await mount.instance.serviceDesk.endConversation();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
