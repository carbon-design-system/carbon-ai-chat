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
  MessageErrorState,
  OnErrorType,
  PageObjectId,
  type BusEventHumanAgentSend,
  type ChatInstance,
  type MessageRequest,
  type OnErrorData,
  type PublicConfig,
} from '../../../aiChatEntry';
import {
  advance,
  click,
  contractChat,
  contractSetup,
  DANA,
  deferred,
  fakeDesk,
  getByTestId,
  inputField,
  mainPanelText,
  pause,
  responseOf,
  textItem,
  typeText,
  type FakeDesk,
} from '../helpers/contract';

// Kept from before any test fakes timers, so a bounded wait stays real.
const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

const UNCONFIRMED =
  'The service desk did not confirm that the message was sent, so the chat marked it failed.';
const REFUSED =
  'The service desk could not send the message, so the chat marked it failed.';

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

/** Fakes only `setTimeout`, which owns the agent send deadlines. */
function controlTimeouts(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

/** An open chat whose composer talks to a joined agent. */
async function joinedAgentChat(config: Partial<PublicConfig> = {}) {
  const desk = fakeDesk();
  const errors: OnErrorData[] = [];
  const mount = await contractChat({
    openChatByDefault: true,
    onError: (error): void => {
      errors.push(error);
    },
    serviceDeskFactory: desk.factory,
    ...config,
    messaging: { skipWelcome: true, ...config.messaging },
  });
  await act(() => mount.instance.serviceDesk.startConversation());
  await act(() => desk.callback().agentJoined(DANA));
  await waitFor(() => expect(inputField().disabled).toBe(false));
  return { desk, errors, mount };
}

async function sendFromComposer(text: string): Promise<void> {
  await typeText(text);
  await click(getByTestId(PageObjectId.INPUT_SEND));
}

/**
 * Holds the desk's `sendMessageToAgent` until `release`. `afterRelease` runs on
 * the request just before the desk call returns.
 */
function holdDeskSend(
  desk: FakeDesk,
  afterRelease?: (message: MessageRequest) => void
) {
  const entered = deferred<MessageRequest>();
  const release = deferred();
  const returned: Promise<void>[] = [];
  desk.desk.sendMessageToAgent.mockImplementation((message) => {
    entered.resolve(message);
    const work = release.promise.then(() => {
      afterRelease?.(message);
    });
    returned.push(work);
    return work;
  });
  return { entered, release, returned };
}

async function enteredRequest(
  entered: Promise<MessageRequest>
): Promise<MessageRequest> {
  let request: MessageRequest;
  await act(async () => {
    request = await bounded(entered, 'Held desk send');
  });
  return request;
}

function storedMessage(instance: ChatInstance, id: string) {
  return instance.state.get().messages.find((message) => message.id === id);
}

async function replaceWithResponse(
  instance: ChatInstance,
  id: string,
  text: string
): Promise<void> {
  await act(async () => {
    await instance.messaging.removeMessages([id]);
    await instance.messaging.addMessage(responseOf(id, [textItem(text)]));
  });
}

describe('public human-agent send outcomes', () => {
  contractSetup();

  it('marks an unconfirmed agent send retrying at 3 s and failed at 20 s without onError, then clears only that failure when the desk confirms late', async () => {
    const { desk, errors, mount } = await joinedAgentChat();
    const held = holdDeskSend(desk);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorState = (id: string) =>
      storedMessage(mount.instance, id)?.history?.error_state;
    try {
      controlTimeouts();
      await sendFromComposer('Please confirm this');
      const request = await enteredRequest(held.entered.promise);
      expect(mount.instance.state.get().status).toBe('submitted');

      await advance(2999);
      expect(errorState(request.id)).not.toBe(MessageErrorState.RETRYING);
      await advance(1);
      expect(errorState(request.id)).toBe(MessageErrorState.RETRYING);
      await advance(16_999);
      expect(mount.instance.state.get().status).toBe('submitted');
      await advance(1);
      expect(errorState(request.id)).toBe(MessageErrorState.FAILED);
      expect(mount.instance.state.get().status).toBe('error');
      expect(mount.instance.state.get().error).toEqual({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: UNCONFIRMED,
        messageID: request.id,
      });
      expect(errors).toEqual([]);

      await act(async () => {
        held.release.resolve();
        await Promise.all(held.returned);
      });
      await advance(0);
      expect(mount.instance.state.get().status).toBe('ready');
      expect(mount.instance.state.get().error).toBeNull();
      expect(errorState(request.id)).toBe(MessageErrorState.NONE);
      expect(errors).toEqual([]);
    } finally {
      held.release.resolve();
      vi.useRealTimers();
      log.mockRestore();
      try {
        await act(async () => {
          await bounded(Promise.allSettled(held.returned), 'Desk cleanup');
          await mount.instance.serviceDesk.endConversation();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('keeps a newer assistant failure when an agent send that timed out before it is confirmed late', async () => {
    const assistant: MessageRequest[] = [];
    const { desk, errors, mount } = await joinedAgentChat({
      messaging: {
        customSendMessage: async (request) => {
          assistant.push(request);
          throw new Error('Assistant transport failed');
        },
      },
    });
    const held = holdDeskSend(desk);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      controlTimeouts();
      await sendFromComposer('Agent request that times out');
      const request = await enteredRequest(held.entered.promise);
      await advance(20_000);
      expect(mount.instance.state.get().status).toBe('error');
      expect(mount.instance.state.get().error).toMatchObject({
        message: UNCONFIRMED,
        messageID: request.id,
      });

      // A send from code still goes to the assistant during an agent chat.
      await act(async () => {
        await expect(
          mount.instance.send('Assistant request after the agent timeout')
        ).rejects.toThrow('Assistant transport failed');
      });
      expect(assistant).toHaveLength(1);
      const newer = mount.instance.state.get().error;
      expect(newer).toMatchObject({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        messageID: assistant[0].id,
      });
      expect(errors).toEqual([
        expect.objectContaining({
          errorType: OnErrorType.MESSAGE_COMMUNICATION,
          messageID: assistant[0].id,
        }),
      ]);

      await act(async () => {
        held.release.resolve();
        await Promise.all(held.returned);
      });
      await advance(0);
      expect(mount.instance.state.get().status).toBe('error');
      expect(mount.instance.state.get().error).toBe(newer);
      expect(errors).toHaveLength(1);
    } finally {
      held.release.resolve();
      vi.useRealTimers();
      log.mockRestore();
      try {
        await act(async () => {
          await bounded(Promise.allSettled(held.returned), 'Desk cleanup');
          await mount.instance.serviceDesk.endConversation();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it("reports a refused agent send as submitted then error with the desk's Error, and the next accepted send as submitted then ready, without onError", async () => {
    const { desk, errors, mount } = await joinedAgentChat();
    const deskError = new Error('Desk refused the message');
    desk.desk.sendMessageToAgent.mockImplementationOnce(() =>
      Promise.reject(deskError)
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const statuses: string[] = [];
    const unsubscribe = mount.instance.state.select(
      (state) => state.status,
      (status) => {
        statuses.push(status);
      }
    );
    try {
      await sendFromComposer('Refused by the desk');
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('error')
      );
      const [refused] = desk.desk.sendMessageToAgent.mock.calls[0];
      expect(statuses).toEqual(['submitted', 'error']);
      expect(mount.instance.state.get().error).toEqual({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: REFUSED,
        otherData: deskError,
        messageID: refused.id,
      });
      expect(mount.instance.state.get().error?.otherData).toBe(deskError);
      expect(errors).toEqual([]);

      statuses.length = 0;
      await sendFromComposer('Accepted by the desk');
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      expect(desk.desk.sendMessageToAgent).toHaveBeenCalledTimes(2);
      expect(statuses).toEqual(['submitted', 'ready']);
      expect(mount.instance.state.get().error).toBeNull();
      expect(errors).toEqual([]);
    } finally {
      unsubscribe();
      log.mockRestore();
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('keeps a same-ID replacement when the held desk call edits its old request and settles', async () => {
    const { desk, errors, mount } = await joinedAgentChat();
    const held = holdDeskSend(desk, (message) => {
      message.input.structured_data = { user_defined: { stale: true } };
    });
    try {
      await sendFromComposer('Old agent request');
      const request = await enteredRequest(held.entered.promise);
      await replaceWithResponse(
        mount.instance,
        request.id,
        'Replacement after removal'
      );
      const replacement = storedMessage(mount.instance, request.id);
      expect(replacement).toMatchObject({
        output: {
          generic: [
            expect.objectContaining({ text: 'Replacement after removal' }),
          ],
        },
      });

      await act(async () => {
        held.release.resolve();
        await Promise.all(held.returned);
      });
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      // Give the send's last write-back a chance to land.
      await pause();
      expect(storedMessage(mount.instance, request.id)).toEqual(replacement);
      expect(storedMessage(mount.instance, request.id)).not.toHaveProperty(
        'input'
      );
      await waitFor(() =>
        expect(mainPanelText()).toContain('Replacement after removal')
      );
      expect(mainPanelText()).not.toContain('Old agent request');
      expect(errors).toEqual([]);
    } finally {
      held.release.resolve();
      try {
        await act(async () => {
          await bounded(Promise.allSettled(held.returned), 'Desk cleanup');
          await mount.instance.serviceDesk.endConversation();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('keeps a same-ID replacement when a held human_agent:send handler edits its old request and settles', async () => {
    const { errors, mount } = await joinedAgentChat();
    const entered = deferred<MessageRequest>();
    const release = deferred();
    const finished = deferred();
    const sendHandler = {
      type: BusEventType.HUMAN_AGENT_SEND,
      handler: async (event: BusEventHumanAgentSend) => {
        entered.resolve(event.data);
        await release.promise;
        event.data.input.structured_data = { user_defined: { stale: true } };
        finished.resolve();
      },
    };
    mount.instance.on(sendHandler);
    try {
      await sendFromComposer('Old agent request');
      const request = await enteredRequest(entered.promise);
      await replaceWithResponse(
        mount.instance,
        request.id,
        'Replacement after removal'
      );
      const replacement = storedMessage(mount.instance, request.id);
      expect(replacement).toMatchObject({
        output: {
          generic: [
            expect.objectContaining({ text: 'Replacement after removal' }),
          ],
        },
      });

      await act(async () => {
        release.resolve();
        await bounded(finished.promise, 'Held send handler');
      });
      // Give the send's last write-back a chance to land.
      await pause();
      expect(storedMessage(mount.instance, request.id)).toEqual(replacement);
      expect(storedMessage(mount.instance, request.id)).not.toHaveProperty(
        'input'
      );
      expect(mount.instance.state.get().status).toBe('ready');
      await waitFor(() =>
        expect(mainPanelText()).toContain('Replacement after removal')
      );
      expect(mainPanelText()).not.toContain('Old agent request');
      expect(errors).toEqual([]);
    } finally {
      release.resolve();
      mount.instance.off(sendHandler);
      try {
        await act(() => mount.instance.serviceDesk.endConversation());
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('keeps the 3 s warning and the 20 s failure mark off a same-ID replacement while its old agent send is unconfirmed', async () => {
    const { desk, errors, mount } = await joinedAgentChat();
    const held = holdDeskSend(desk);
    try {
      controlTimeouts();
      await sendFromComposer('Old agent request');
      const request = await enteredRequest(held.entered.promise);
      await replaceWithResponse(
        mount.instance,
        request.id,
        'Replacement after removal'
      );
      const replacement = storedMessage(mount.instance, request.id);
      expect(replacement).toMatchObject({
        output: {
          generic: [
            expect.objectContaining({ text: 'Replacement after removal' }),
          ],
        },
      });

      await advance(3000);
      expect(storedMessage(mount.instance, request.id)).toEqual(replacement);
      expect(mount.instance.state.get().status).toBe('submitted');
      await advance(17_000);
      expect(storedMessage(mount.instance, request.id)).toEqual(replacement);
      // The old send's deadline still fails the conversation; only its message marks are skipped.
      expect(mount.instance.state.get().status).toBe('error');
      expect(mount.instance.state.get().error).toEqual({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: UNCONFIRMED,
        messageID: request.id,
      });
      expect(errors).toEqual([]);

      await act(async () => {
        held.release.resolve();
        await Promise.all(held.returned);
      });
      await advance(0);
      expect(storedMessage(mount.instance, request.id)).toEqual(replacement);
      expect(mount.instance.state.get().status).toBe('ready');
      expect(mainPanelText()).toContain('Replacement after removal');
      expect(mainPanelText()).not.toContain('Old agent request');
    } finally {
      held.release.resolve();
      vi.useRealTimers();
      try {
        await act(async () => {
          await bounded(Promise.allSettled(held.returned), 'Desk cleanup');
          await mount.instance.serviceDesk.endConversation();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
