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
  MessageResponseTypes,
  MessageState,
  UserType,
  type MessageResponse,
  type ServiceDesk,
  type ServiceDeskCallback,
} from '../../../aiChatEntry';
import { contractChat, contractSetup, deferred } from '../helpers/contract';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

describe('public automatic agent start', () => {
  contractSetup();

  it('automatically starts the actual service desk once when a native response completes with the connect card skipped', async () => {
    let callback: ServiceDeskCallback;
    let checks = 0;
    const starts: MessageResponse[] = [];
    const desk: ServiceDesk = {
      getName: () => 'Automatic start contract desk',
      areAnyAgentsOnline: async () => {
        checks += 1;
        return true;
      },
      startChat: async (message) => {
        starts.push(message);
      },
      endChat: async () => undefined,
      sendMessageToAgent: async () => undefined,
    };
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      serviceDesk: { skipConnectHumanAgentCard: true },
      serviceDeskFactory: async ({ callback: handed }) => {
        callback = handed;
        return desk;
      },
    });
    const response = (note: string): MessageResponse => ({
      id: 'automatic-agent',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
            streaming_metadata: { id: 'agent' },
            message_to_human_agent: note,
          },
        ],
      },
    });
    const write = (state: MessageState, note: string) =>
      act(() =>
        mount.instance.messaging.upsertMessage('automatic-agent', state, () =>
          response(note)
        )
      );
    try {
      await write(MessageState.STREAMING, 'Initial native request');
      expect(checks).toBe(0);
      expect(starts).toEqual([]);
      await write(MessageState.COMPLETE, 'Initial native request');
      await waitFor(() => expect(starts).toHaveLength(1));
      expect(starts[0]).toMatchObject({
        id: 'automatic-agent',
        output: {
          generic: [{ message_to_human_agent: 'Initial native request' }],
        },
      });
      await act(() =>
        callback.agentJoined({
          id: 'automatic-agent-user',
          nickname: 'Contract agent',
          user_type: UserType.HUMAN,
        })
      );
      expect(mount.instance.state.get().humanAgent).toMatchObject({
        isConnected: true,
        responseUserProfile: {
          id: 'automatic-agent-user',
          nickname: 'Contract agent',
        },
      });
      await write(MessageState.COMPLETE, 'Changed native request');
      expect(checks).toBe(1);
      expect(starts).toHaveLength(1);
    } finally {
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('starts the current desk once when the host replaces the desk factory during a held availability check', async () => {
    const checking = deferred();
    const availability = deferred<boolean>();
    const replacementLoaded = deferred();
    const replacementStarted = deferred();
    const heldStarts: MessageResponse[] = [];
    const replacementStarts: MessageResponse[] = [];
    let replacementFactories = 0;
    const heldDesk: ServiceDesk = {
      getName: () => 'Held availability desk',
      areAnyAgentsOnline: async () => {
        checking.resolve();
        return availability.promise;
      },
      startChat: async (message) => {
        heldStarts.push(message);
      },
      endChat: async () => undefined,
      sendMessageToAgent: async () => undefined,
    };
    const replacementDesk: ServiceDesk = {
      getName: () => 'Replacement desk',
      startChat: async (message) => {
        replacementStarts.push(message);
        replacementStarted.resolve();
      },
      endChat: async () => undefined,
      sendMessageToAgent: async () => undefined,
    };
    const config = {
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      serviceDesk: { skipConnectHumanAgentCard: true },
    };
    const mount = await contractChat({
      ...config,
      serviceDeskFactory: async () => heldDesk,
    });
    let writing: Promise<void> = Promise.resolve();
    try {
      await act(async () => {
        writing = mount.instance.messaging.upsertMessage(
          'held-availability',
          MessageState.COMPLETE,
          () => ({
            id: 'held-availability',
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
                  message_to_human_agent: 'Swapped while checking',
                },
              ],
            },
          })
        );
        void writing.catch((): void => undefined);
        await bounded(checking.promise, 'Held availability check');
      });
      expect(mount.instance.state.get().isMessageLoadingCounter).toBe(1);
      await mount.rerender({
        ...config,
        serviceDeskFactory: async () => {
          replacementFactories += 1;
          replacementLoaded.resolve();
          return replacementDesk;
        },
      });
      await act(() =>
        bounded(replacementLoaded.promise, 'Replacement factory')
      );
      expect(replacementFactories).toBe(1);
      expect(mount.instance.state.get().humanAgent.isConnecting).toBe(false);
      await act(async () => {
        availability.resolve(true);
        await bounded(writing, 'Connect response write');
        await bounded(replacementStarted.promise, 'Replacement desk start');
      });
      expect(replacementStarts).toHaveLength(1);
      expect(replacementStarts[0]).toMatchObject({
        id: 'held-availability',
        output: {
          generic: [{ message_to_human_agent: 'Swapped while checking' }],
        },
      });
      expect(heldStarts).toEqual([]);
      expect(mount.instance.state.get().humanAgent.isConnecting).toBe(true);
      expect(mount.instance.state.get().isMessageLoadingCounter).toBe(0);
    } finally {
      availability.resolve(false);
      try {
        await act(async () => {
          await bounded(
            Promise.allSettled([writing]),
            'Owned connect write cleanup'
          );
          await mount.instance.serviceDesk.endConversation();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
