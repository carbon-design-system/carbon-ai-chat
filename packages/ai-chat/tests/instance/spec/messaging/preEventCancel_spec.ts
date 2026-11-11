/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A `pre:` event handler cancels the action that follows by setting `cancel`, also after an
 * `await`. The conversation cases run on SDK chats with no view; the view case renders one.
 */

import { waitFor } from '@testing-library/react';

import { createChatSDK } from '../../../../src/sdk';
import { chatOf } from '../../../../src/sdk/internal';
import type { ChatSDKHandle } from '../../../../src/sdk/handle';
import { resolvablePromise } from '../../../../src/shared/utils/resolvablePromise';
import type { ChatSDKConfig } from '../../../../src/types/config/ChatSDKConfig';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  FileStatusValue,
  type FileUpload,
  type ServiceDesk,
  type ServiceDeskCallback,
} from '../../../../src/types/config/ServiceDeskConfig';
import {
  BusEventType,
  type BusEvent,
  type BusEventHumanAgentEndChat,
  type BusEventHumanAgentPreEndChat,
  type BusEventHumanAgentPreReceive,
  type BusEventHumanAgentPreSend,
  type BusEventPreReceive,
  type BusEventPreReset,
} from '../../../../src/types/events/eventBusTypes';
import { ViewType } from '../../../../src/types/instance/apiTypes';
import type { PublicConfig } from '../../../../src/types/config/PublicConfig';
import {
  HumanAgentMessageType,
  MessageResponseTypes,
  UserType,
  type MessageResponse,
} from '../../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

const AGENT = { id: 'dana', nickname: 'Dana', user_type: UserType.HUMAN };

function mockDesk() {
  let callback: ServiceDeskCallback;
  const desk = {
    getName: () => 'Test desk',
    startChat: jest.fn(async () => {}),
    endChat: jest.fn(async () => {}),
    sendMessageToAgent: jest.fn(async () => {}),
  };
  return {
    desk,
    callback: () => callback,
    factory: async (parameters: { callback: ServiceDeskCallback }) => {
      callback = parameters.callback;
      return desk as unknown as ServiceDesk;
    },
  };
}

function response(id: string, text = `Reply ${id}`): MessageResponse {
  return {
    id,
    output: { generic: [{ response_type: MessageResponseTypes.TEXT, text }] },
  };
}

/** A handler that waits until `release()`, then sets `flag`. */
function cancelAfterAwait(flag = 'cancel') {
  const entered = resolvablePromise<void>();
  const gate = resolvablePromise<void>();
  const handler = jest.fn(async (event: BusEvent) => {
    entered.doResolve();
    await gate;
    (event as unknown as Record<string, boolean>)[flag] = true;
  });
  return { handler, entered, release: () => gate.doResolve() };
}

/** An SDK chat or a prebuilt chat's instance. */
type Target = Pick<ChatSDKHandle, 'state'> & {
  on(handlers: any): unknown;
};

/** The event types fired from now on, in order. */
function record(target: Target, types: BusEventType[]) {
  const fired: BusEventType[] = [];
  target.on(
    types.map((type) => ({
      type,
      handler: () => {
        fired.push(type);
      },
    }))
  );
  return fired;
}

function ids(target: Target) {
  return target.state.get().messages.map((message) => message.id);
}

function agentNotes(chat: ChatSDKHandle) {
  return chat.state
    .get()
    .messages.flatMap((message) =>
      'output' in message
        ? message.output.generic.map((item) => item.agent_message_type)
        : []
    );
}

function inputFile(id: string): FileUpload {
  return {
    id,
    file: new File(['x'], `${id}.txt`),
    status: FileStatusValue.COMPLETE,
  };
}

describe('canceling pre: events', () => {
  const chats: ChatSDKHandle[] = [];
  beforeEach(setupBeforeEach);
  afterEach(() => {
    chats.splice(0).forEach((chat) => chat.destroy());
    setupAfterEach();
  });

  async function sdkChat(config: ChatSDKConfig = {}) {
    const mock = mockDesk();
    const chat = await createChatSDK({
      messaging: { skipWelcome: true },
      serviceDeskFactory: mock.factory,
      ...config,
    });
    chats.push(chat);
    return { chat, ...mock };
  }

  async function connectedChat() {
    const created = await sdkChat();
    await created.chat.serviceDesk.startConversation();
    await created.callback().agentJoined(AGENT);
    return created;
  }

  /** A spy on every store notification from now on. */
  function watchStore(chat: ChatSDKHandle) {
    const notified = jest.fn();
    chatOf(chat).store.subscribe(notified);
    return notified;
  }

  it('adds no cancel key to a payload no handler cancels', async () => {
    const { chat } = await sdkChat();
    const keys: string[][] = [];
    const collect = (event: object) => {
      keys.push(Object.keys(event).sort());
    };
    chat.on([
      { type: BusEventType.PRE_RECEIVE, handler: collect },
      { type: BusEventType.PRE_RESTART_CONVERSATION, handler: collect },
    ]);
    await chat.messaging.upsertMessage('reply', MessageState.COMPLETE, () =>
      response('reply')
    );
    await chat.messaging.restartConversation();
    expect(keys).toEqual([['data', 'type'], ['type']]);
  });

  describe('pre:restartConversation', () => {
    it('leaves the conversation, its running send, and the store as they were', async () => {
      const releaseSend = resolvablePromise<void>();
      let signal: AbortSignal | undefined;
      const { chat } = await sdkChat({
        messaging: {
          skipWelcome: true,
          customSendMessage: async (_request, options) => {
            signal = options.signal;
            await releaseSend;
          },
        },
      });
      await chat.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
        response('kept')
      );
      const sending = chat.messaging.send('Still going');
      await waitFor(() => expect(signal).toBeDefined());
      const fired = record(chat, [BusEventType.RESTART_CONVERSATION]);
      const cancel = cancelAfterAwait();
      chat.on({
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: cancel.handler,
      });
      const before = chat.state.get();
      const notified = watchStore(chat);

      const restarting = chat.messaging.restartConversation();
      await cancel.entered;
      cancel.release();
      await expect(restarting).resolves.toBeUndefined();

      expect(notified).not.toHaveBeenCalled();
      expect(chat.state.get()).toBe(before);
      expect(fired).toEqual([]);
      expect(signal.aborted).toBe(false);
      releaseSend.doResolve();
      await expect(sending).resolves.toBeUndefined();
    });

    it('lets a later restart run', async () => {
      const { chat } = await sdkChat();
      await chat.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
        response('kept')
      );
      let cancelNext = true;
      chat.on({
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: (event: BusEventPreReset) => {
          event.cancel = cancelNext;
        },
      });
      const fired = record(chat, [BusEventType.RESTART_CONVERSATION]);

      await chat.messaging.restartConversation();
      expect(ids(chat)).toEqual(['kept']);
      expect(chatOf(chat).store.getState().isRestarting).toBe(false);

      cancelNext = false;
      await chat.messaging.restartConversation();
      expect(fired).toEqual([BusEventType.RESTART_CONVERSATION]);
      expect(ids(chat)).toEqual([]);
    });

    it('keeps a live agent chat', async () => {
      const { chat, desk } = await connectedChat();
      chat.on({
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: (event: BusEventPreReset) => {
          event.cancel = true;
        },
      });
      await chat.messaging.restartConversation();
      expect(chat.state.get().humanAgent.isConnected).toBe(true);
      expect(desk.endChat).not.toHaveBeenCalled();
    });

    it('still drops an upsert that was waiting on its updater when the restart began', async () => {
      const { chat } = await sdkChat();
      const updaterEntered = resolvablePromise<void>();
      const releaseUpdater = resolvablePromise<MessageResponse>();
      const pending = chat.messaging.upsertMessage(
        'late',
        MessageState.COMPLETE,
        () => {
          updaterEntered.doResolve();
          return releaseUpdater;
        }
      );
      await updaterEntered;
      chat.on({
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: (event: BusEventPreReset) => {
          event.cancel = true;
        },
      });
      await chat.messaging.restartConversation();
      releaseUpdater.doResolve(response('late'));
      await pending;
      expect(ids(chat)).not.toContain('late');
    });

    it.each([true, false])(
      'with cancel %s, an upsert past its updater finishes, or the restart clears it',
      async (cancel) => {
        const { chat } = await sdkChat();
        await chat.messaging.upsertMessage('part', MessageState.STREAMING, () =>
          response('part', 'Part')
        );
        const receiving = resolvablePromise<void>();
        const releaseReceive = resolvablePromise<void>();
        chat.on({
          type: BusEventType.PRE_RECEIVE,
          handler: async () => {
            receiving.doResolve();
            await releaseReceive;
          },
        });
        chat.on({
          type: BusEventType.PRE_RESTART_CONVERSATION,
          handler: (event: BusEventPreReset) => {
            event.cancel = cancel;
          },
        });
        const completing = chat.messaging.upsertMessage(
          'part',
          MessageState.COMPLETE,
          () => response('part', 'Whole')
        );
        await receiving;
        await chat.messaging.restartConversation();
        releaseReceive.doResolve();
        await completing;

        const messages = chat.state.get().messages as MessageResponse[];
        expect(messages.map(({ output }) => output.generic[0])).toEqual(
          cancel ? [expect.objectContaining({ text: 'Whole' })] : []
        );
        expect(chat.state.get().status).toBe('ready');
      }
    );

    it('lets an addMessage reply waiting on pre:receive land', async () => {
      const { instance } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const receiving = resolvablePromise<void>();
      const releaseReceive = resolvablePromise<void>();
      instance.on({
        type: BusEventType.PRE_RECEIVE,
        handler: async () => {
          receiving.doResolve();
          await releaseReceive;
        },
      });
      instance.on({
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: (event: BusEventPreReset) => {
          event.cancel = true;
        },
      });
      const fired = record(instance, [BusEventType.RECEIVE]);

      const adding = instance.messaging.addMessage(response('late-reply'));
      await receiving;
      await instance.messaging.restartConversation();
      releaseReceive.doResolve();
      await adding;

      expect(ids(instance)).toContain('late-reply');
      expect(fired).toEqual([BusEventType.RECEIVE]);
    });

    it('lets a chunk turn waiting on pre:receive finish and the queued send go', async () => {
      const sent: string[] = [];
      const firstStreaming = resolvablePromise<void>();
      const config: PublicConfig = {
        ...createBaseConfig(),
        messaging: {
          skipWelcome: true,
          customSendMessage: async (request, _options, chatInstance) => {
            sent.push(request.input.text);
            if (request.input.text === 'first') {
              await chatInstance.messaging.addMessageChunk({
                streaming_metadata: { response_id: 'streamed' },
                partial_item: {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Partial',
                  streaming_metadata: { id: 'text', cancellable: true },
                },
              });
              firstStreaming.doResolve();
            }
          },
        },
      };
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const first = instance.messaging.send('first');
      await firstStreaming;
      await first;
      const second = instance.messaging.send('second');
      const receiving = resolvablePromise<void>();
      const releaseReceive = resolvablePromise<void>();
      instance.on({
        type: BusEventType.PRE_RECEIVE,
        handler: async (event: BusEventPreReceive) => {
          if (event.data.id === 'streamed') {
            receiving.doResolve();
            await releaseReceive;
          }
        },
      });
      instance.on({
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: (event: BusEventPreReset) => {
          event.cancel = true;
        },
      });

      const finishing = instance.messaging.addMessageChunk({
        final_response: response('streamed', 'Whole'),
      });
      await receiving;
      await instance.messaging.restartConversation();
      releaseReceive.doResolve();
      await finishing;
      await waitFor(() => expect(sent).toEqual(['first', 'second']));
      await second;

      expect(ids(instance)).toContain('streamed');
      expect(instance.state.get().status).toBe('ready');
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(false);
    });

    it('treats a handler that sets cancel and then throws as a throw', async () => {
      const { chat } = await sdkChat();
      await chat.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
        response('kept')
      );
      chat.on({
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: (event: BusEventPreReset) => {
          event.cancel = true;
          throw new Error('handler failed');
        },
      });

      await expect(chat.messaging.restartConversation()).rejects.toThrow(
        'handler failed'
      );
      expect(ids(chat)).toEqual(['kept']);
      expect(chatOf(chat).store.getState().isRestarting).toBe(false);
    });
  });

  describe('pre:receive', () => {
    it('keeps a whole upserted reply out, with no store change', async () => {
      const { chat } = await sdkChat();
      const fired = record(chat, [BusEventType.RECEIVE]);
      const cancel = cancelAfterAwait();
      chat.on({ type: BusEventType.PRE_RECEIVE, handler: cancel.handler });
      const notified = watchStore(chat);

      const upserting = chat.messaging.upsertMessage(
        'whole',
        MessageState.COMPLETE,
        () => response('whole')
      );
      await cancel.entered;
      cancel.release();
      await upserting;

      expect(notified).not.toHaveBeenCalled();
      expect(ids(chat)).toEqual([]);
      expect(fired).toEqual([]);
    });

    it('removes a streamed upsert whose completion is canceled, and ends its stream', async () => {
      const { chat } = await sdkChat();
      await chat.messaging.upsertMessage(
        'streamed',
        MessageState.STREAMING,
        () => response('streamed', 'Partial')
      );
      expect(ids(chat)).toEqual(['streamed']);
      expect(chat.state.get().status).toBe('streaming');
      const fired = record(chat, [BusEventType.RECEIVE]);
      const cancel = cancelAfterAwait();
      chat.on({ type: BusEventType.PRE_RECEIVE, handler: cancel.handler });

      const completing = chat.messaging.upsertMessage(
        'streamed',
        MessageState.COMPLETE,
        () => response('streamed', 'Whole')
      );
      await cancel.entered;
      cancel.release();
      await completing;

      expect(ids(chat)).toEqual([]);
      expect(chat.state.get().status).toBe('ready');
      expect(fired).toEqual([]);
    });

    it('leaves a settled reply in place when a later completion is canceled', async () => {
      const { chat } = await sdkChat();
      await chat.messaging.upsertMessage('failed', MessageState.ERROR, () =>
        response('failed', 'Failed')
      );
      chat.on({
        type: BusEventType.PRE_RECEIVE,
        handler: (event: BusEventPreReceive) => {
          event.cancel = true;
        },
      });
      await chat.messaging.upsertMessage('failed', MessageState.COMPLETE, () =>
        response('failed', 'Recovered')
      );
      const [stored] = chat.state.get().messages as MessageResponse[];
      expect(stored.id).toBe('failed');
      expect(stored.output.generic[0]).toMatchObject({ text: 'Failed' });
    });

    it('keeps a reply from addMessage out, with no store change', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const fired = record(instance, [BusEventType.RECEIVE]);
      const cancel = cancelAfterAwait();
      instance.on({ type: BusEventType.PRE_RECEIVE, handler: cancel.handler });
      const before = ids(instance);
      const notified = jest.fn();
      store.subscribe(notified);

      const adding = instance.messaging.addMessage(response('whole'));
      await cancel.entered;
      cancel.release();
      await adding;

      expect(notified).not.toHaveBeenCalled();
      expect(ids(instance)).toEqual(before);
      expect(fired).toEqual([]);
    });

    it('removes a chunk-streamed reply whose final response is canceled, and sends the next queued message', async () => {
      const sent: string[] = [];
      const firstStreaming = resolvablePromise<void>();
      const config: PublicConfig = {
        ...createBaseConfig(),
        messaging: {
          skipWelcome: true,
          customSendMessage: async (request, _options, chatInstance) => {
            sent.push(request.input.text);
            if (request.input.text === 'first') {
              await chatInstance.messaging.addMessageChunk({
                streaming_metadata: { response_id: 'streamed' },
                partial_item: {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Partial',
                  streaming_metadata: { id: 'text', cancellable: true },
                },
              });
              firstStreaming.doResolve();
            }
          },
        },
      };
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const first = instance.messaging.send('first');
      await firstStreaming;
      await first;
      const second = instance.messaging.send('second');
      expect(ids(instance)).toContain('streamed');
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(true);
      // The chunk stream holds the queue until its final response.
      expect(sent).toEqual(['first']);

      const fired = record(instance, [BusEventType.RECEIVE]);
      const cancel = cancelAfterAwait();
      instance.on({ type: BusEventType.PRE_RECEIVE, handler: cancel.handler });
      const finishing = instance.messaging.addMessageChunk({
        final_response: response('streamed', 'Whole'),
      });
      await cancel.entered;
      cancel.release();
      await finishing;
      await waitFor(() => expect(sent).toEqual(['first', 'second']));
      await second;

      expect(ids(instance)).not.toContain('streamed');
      expect(fired).toEqual([]);
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(false);
    });

    it('hides the stop button when a canceled chunk stream was the last one', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const isStopVisible = () =>
        store.getState().assistantInputState.stopStreamingButtonState.isVisible;
      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'alone' },
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          text: 'Partial',
          streaming_metadata: { id: 'text', cancellable: true },
        },
      });
      expect(isStopVisible()).toBe(true);
      instance.on({
        type: BusEventType.PRE_RECEIVE,
        handler: (event: BusEventPreReceive) => {
          event.cancel = true;
        },
      });

      await instance.messaging.addMessageChunk({
        final_response: response('alone', 'Whole'),
      });

      expect(ids(instance)).not.toContain('alone');
      expect(isStopVisible()).toBe(false);
      expect(instance.state.get().status).toBe('ready');
    });

    it('removes a streamed reply whose handler changed its ID and then canceled', async () => {
      const { instance } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'renamed' },
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          text: 'Partial',
          streaming_metadata: { id: 'text' },
        },
      });
      instance.on({
        type: BusEventType.PRE_RECEIVE,
        handler: (event: BusEventPreReceive) => {
          event.data.id = 'other';
          event.cancel = true;
        },
      });

      await instance.messaging.addMessageChunk({
        final_response: response('renamed', 'Whole'),
      });

      expect(ids(instance)).not.toContain('renamed');
      expect(ids(instance)).not.toContain('other');
      expect(instance.state.get().status).toBe('ready');
    });
  });

  describe('human_agent:pre:send', () => {
    it('stops the message and its uploads, with no store change after the cancel', async () => {
      const { chat, desk } = await connectedChat();
      const fired = record(chat, [BusEventType.HUMAN_AGENT_SEND]);
      const entered = resolvablePromise<void>();
      const gate = resolvablePromise<void>();
      let notified: jest.Mock | undefined;
      chat.on({
        type: BusEventType.HUMAN_AGENT_PRE_SEND,
        handler: async (event: BusEventHumanAgentPreSend) => {
          entered.doResolve();
          await gate;
          notified = watchStore(chat);
          event.cancel = true;
        },
      });
      const before = chat.state.get().messages;

      const sending = chatOf(chat).humanAgentService.sendMessageToAgent(
        'Hello',
        [inputFile('upload')]
      );
      await entered;
      gate.doResolve();
      await sending;

      expect(notified).toBeDefined();
      expect(notified).not.toHaveBeenCalled();
      expect(chat.state.get().messages).toBe(before);
      expect(desk.sendMessageToAgent).not.toHaveBeenCalled();
      expect(fired).toEqual([]);
    });
  });

  describe('human_agent:pre:receive', () => {
    it("keeps an agent's message out, with no store change", async () => {
      const { chat, callback } = await connectedChat();
      const fired = record(chat, [BusEventType.HUMAN_AGENT_RECEIVE]);
      const cancel = cancelAfterAwait();
      chat.on({
        type: BusEventType.HUMAN_AGENT_PRE_RECEIVE,
        handler: cancel.handler,
      });
      const before = chat.state.get().messages;
      const notified = watchStore(chat);

      const receiving = callback().sendMessageToUser('Hi there');
      await cancel.entered;
      cancel.release();
      await receiving;

      expect(notified).not.toHaveBeenCalled();
      expect(chat.state.get().messages).toBe(before);
      expect(fired).toEqual([]);
    });

    it.each([true, false])(
      'with cancel %s, decides whether the joined note shows; the agent joins either way',
      async (cancel) => {
        const { chat, callback } = await sdkChat();
        chat.on({
          type: BusEventType.HUMAN_AGENT_PRE_RECEIVE,
          handler: (event: BusEventHumanAgentPreReceive) => {
            const joined = event.data.output.generic.some(
              (item) =>
                item.agent_message_type ===
                HumanAgentMessageType.HUMAN_AGENT_JOINED
            );
            event.cancel = joined && cancel;
          },
        });
        await chat.serviceDesk.startConversation();
        await callback().agentJoined(AGENT);

        expect(chat.state.get().humanAgent.isConnected).toBe(true);
        expect(
          agentNotes(chat).includes(HumanAgentMessageType.HUMAN_AGENT_JOINED)
        ).toBe(!cancel);
      }
    );
  });

  describe('the events with older flags', () => {
    it.each(['cancel', 'cancelStartChat'])(
      '%s on human_agent:pre:startChat cancels the start',
      async (flag) => {
        const { chat, desk } = await sdkChat();
        const ended: BusEventHumanAgentEndChat[] = [];
        chat.on({
          type: BusEventType.HUMAN_AGENT_END_CHAT,
          handler: (event: BusEventHumanAgentEndChat) => {
            ended.push(event);
          },
        });
        const cancel = cancelAfterAwait(flag);
        chat.on({
          type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
          handler: cancel.handler,
        });

        const starting = chat.serviceDesk.startConversation();
        await cancel.entered;
        cancel.release();
        await expect(starting).resolves.toBeUndefined();

        expect(desk.startChat).not.toHaveBeenCalled();
        expect(ended.map((event) => event.requestCancelled)).toEqual([true]);
        expect(chat.state.get().humanAgent.isConnecting).toBe(false);
      }
    );

    it.each(['cancel', 'cancelEndChat'])(
      '%s on human_agent:pre:endChat keeps the agent chat',
      async (flag) => {
        const { chat, desk } = await connectedChat();
        const fired = record(chat, [BusEventType.HUMAN_AGENT_END_CHAT]);
        const cancel = cancelAfterAwait(flag);
        chat.on({
          type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
          handler: cancel.handler,
        });

        const ending = chat.serviceDesk.endConversation();
        await cancel.entered;
        cancel.release();
        await ending;

        expect(desk.endChat).not.toHaveBeenCalled();
        expect(fired).toEqual([]);
        expect(chat.state.get().humanAgent.isConnected).toBe(true);
      }
    );

    it('cancel on human_agent:pre:endChat also keeps a chat the agent ended', async () => {
      const { chat, callback } = await connectedChat();
      const fired = record(chat, [BusEventType.HUMAN_AGENT_END_CHAT]);
      chat.on({
        type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
        handler: (event: BusEventHumanAgentPreEndChat) => {
          event.cancel = true;
        },
      });
      await callback().agentEndedChat();

      expect(fired).toEqual([]);
      expect(chat.state.get().humanAgent.isConnected).toBe(true);
    });

    it.each(['cancel', 'cancelViewChange'])(
      '%s on view:pre:change keeps the view',
      async (flag) => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const viewState = () =>
          store.getState().view.persistedToBrowserStorage.viewState;
        const before = viewState();
        const fired = record(instance, [BusEventType.VIEW_CHANGE]);
        const cancel = cancelAfterAwait(flag);
        instance.on({
          type: BusEventType.VIEW_PRE_CHANGE,
          handler: cancel.handler,
        });

        const changing = instance.changeView(
          before.mainWindow ? ViewType.LAUNCHER : ViewType.MAIN_WINDOW
        );
        await cancel.entered;
        cancel.release();
        await changing;

        expect(viewState()).toEqual(before);
        expect(fired).toEqual([]);
      }
    );
  });
});
