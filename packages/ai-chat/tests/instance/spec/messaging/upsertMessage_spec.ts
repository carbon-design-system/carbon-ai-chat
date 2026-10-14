/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import {
  CancellationReason,
  MessageState,
} from '../../../../src/types/config/MessagingConfig';
import { waitFor } from '@testing-library/react';
import { HumanAgentsOnlineStatus } from '../../../../src/chat/services/haa/HumanAgentService';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';

function textResponse(id: string, text: string): MessageResponse {
  return {
    id,
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text }],
    },
  };
}

function userDefinedResponse(
  id: string,
  payload: Record<string, unknown>
): MessageResponse {
  return {
    id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: payload,
        },
      ],
    },
  };
}

describe('ChatInstance.messaging.upsertMessage', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('should expose upsertMessage as a function on instance.messaging', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);
    expect(typeof instance.messaging.upsertMessage).toBe('function');
  });

  describe('stream lifecycle', () => {
    function cancellableResponse(id: string) {
      const message = textResponse(id, 'snapshot');
      message.output.generic[0].streaming_metadata = {
        id: 'text',
        cancellable: true,
      };
      return message;
    }

    it.each([MessageState.COMPLETE, MessageState.ERROR])(
      'keeps early-resolved streams stoppable until %s',
      async (terminal) => {
        const config = createBaseConfig();
        config.messaging.customSendMessage = async (
          _request,
          _options,
          chat
        ) => {
          await chat.messaging.upsertMessage(
            'early',
            MessageState.STREAMING,
            () => cancellableResponse('early')
          );
        };
        const { instance, store, serviceManager } =
          await renderChatAndGetInstanceWithStore(config);
        await instance.send('start');
        expect(
          serviceManager.messageUpsertCoordinator.hasStreamingMessages()
        ).toBe(true);
        expect(
          store.getState().assistantInputState.stopStreamingButtonState
            .isVisible
        ).toBe(true);
        const receive = jest.fn();
        instance.on({ type: BusEventType.RECEIVE, handler: receive });
        await instance.messaging.upsertMessage(
          'early',
          terminal,
          (previous) => previous
        );
        expect(
          serviceManager.messageUpsertCoordinator.hasStreamingMessages()
        ).toBe(false);
        expect(
          store.getState().assistantInputState.stopStreamingButtonState
            .isVisible
        ).toBe(false);
        const item = Object.values(store.getState().allMessageItemsByID).find(
          (item) => item.fullMessageID === 'early'
        );
        expect(item.ui_state.streamingState.isDone).toBe(true);
        expect(receive).toHaveBeenCalledTimes(
          terminal === MessageState.COMPLETE ? 1 : 0
        );
      }
    );

    it.each([
      CancellationReason.STOP_STREAMING,
      CancellationReason.CONVERSATION_RESTARTED,
    ])('aborts an early-resolved producer on %s', async (reason) => {
      let signal: AbortSignal;
      let releaseProducer: () => void;
      const nextSnapshot = new Promise<void>((resolve) => {
        releaseProducer = resolve;
      });
      let producer: Promise<void>;
      const config = createBaseConfig();
      config.messaging.customSendMessage = async (_request, options, chat) => {
        signal = options.signal;
        producer = nextSnapshot.then(async () => {
          if (!signal.aborted) {
            await chat.messaging.upsertMessage(
              'early',
              MessageState.STREAMING,
              () => textResponse('early', 'late snapshot')
            );
          }
        });
        await chat.messaging.upsertMessage(
          'early',
          MessageState.STREAMING,
          () => cancellableResponse('early')
        );
      };
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);
      await instance.send('start');
      if (reason === CancellationReason.CONVERSATION_RESTARTED) {
        await serviceManager.actions.restartConversation({
          skipHydration: true,
        });
      } else {
        await serviceManager.messageService.cancelCurrentMessageRequest();
      }
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBe(reason);
      releaseProducer();
      await producer;
      if (reason === CancellationReason.CONVERSATION_RESTARTED) {
        expect(store.getState().allMessagesByID.early).toBeUndefined();
      } else {
        expect(
          (store.getState().allMessagesByID.early as MessageResponse).output
            .generic[0]
        ).toMatchObject({ text: 'snapshot' });
      }
      expect(
        serviceManager.messageUpsertCoordinator.hasStreamingMessages()
      ).toBe(false);
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(false);
      const item = Object.values(store.getState().allMessageItemsByID).find(
        (item) => item.fullMessageID === 'early'
      );
      if (reason === CancellationReason.CONVERSATION_RESTARTED) {
        expect(item).toBeUndefined();
      } else {
        expect(item.ui_state.streamingState.isDone).toBe(true);
        expect(item.ui_state.isIntermediateStreaming).toBe(false);
      }
    });

    it('discards an upsert enqueued by an abort listener during restart', async () => {
      const config = createBaseConfig();
      let terminalWrite: Promise<void>;
      config.messaging.customSendMessage = async (_request, options, chat) => {
        options.signal.addEventListener('abort', () => {
          terminalWrite = chat.messaging.upsertMessage(
            'early',
            MessageState.COMPLETE,
            () => textResponse('early', 'abort flush')
          );
        });
        await chat.messaging.upsertMessage(
          'early',
          MessageState.STREAMING,
          () => cancellableResponse('early')
        );
      };
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);
      await instance.send('start');
      await serviceManager.actions.restartConversation({ skipHydration: true });
      expect(terminalWrite).toBeDefined();
      await terminalWrite;
      expect(store.getState().allMessagesByID.early).toBeUndefined();
      expect(
        serviceManager.messageUpsertCoordinator.hasStreamingMessages()
      ).toBe(false);
    });

    it('stops unsolicited streaming snapshots without a request controller', async () => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      await instance.messaging.upsertMessage(
        'unsolicited',
        MessageState.STREAMING,
        () => cancellableResponse('unsolicited')
      );
      await serviceManager.messageService.cancelCurrentMessageRequest();
      expect(
        serviceManager.messageUpsertCoordinator.hasStreamingMessages()
      ).toBe(false);
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(false);
      const item = Object.values(store.getState().allMessageItemsByID).find(
        (item) => item.fullMessageID === 'unsolicited'
      );
      expect(item.ui_state.streamingState.isDone).toBe(true);
      await instance.messaging.upsertMessage(
        'unsolicited',
        MessageState.COMPLETE,
        () => textResponse('unsolicited', 'corrected')
      );
      expect(
        (store.getState().allMessagesByID.unsolicited as MessageResponse).output
          .generic[0]
      ).toMatchObject({ text: 'corrected' });
    });

    it.each([MessageState.COMPLETE, MessageState.ERROR])(
      'does not advance or abort unrelated pending sends on unsolicited %s',
      async (terminal) => {
        let resolveA: () => void;
        const pendingA = new Promise<void>((resolve) => {
          resolveA = resolve;
        });
        const config = createBaseConfig();
        const customSend = jest.fn(async (request, _options) => {
          if (request.input.text === 'A') {
            await pendingA;
          }
        });
        config.messaging = {
          ...config.messaging,
          showStopButtonImmediately: true,
          customSendMessage: customSend,
        };
        const { instance, store, serviceManager } =
          await renderChatAndGetInstanceWithStore(config);
        await instance.send('warmup');
        customSend.mockClear();
        const sendA = instance.send('A');
        await waitFor(() => expect(customSend).toHaveBeenCalledTimes(1));
        const sendB = instance.send('B');
        await waitFor(() =>
          expect(
            (serviceManager.messageService as any).queue.waiting
          ).toHaveLength(1)
        );
        const signal = customSend.mock.calls[0][1].signal;
        await instance.messaging.upsertMessage(
          'unsolicited',
          MessageState.STREAMING,
          () => cancellableResponse('unsolicited')
        );
        expect(
          serviceManager.messageService.inboundStreaming.streamingMessageID
        ).toBeNull();
        await instance.messaging.upsertMessage(
          'unsolicited',
          terminal,
          (previous) => previous
        );
        expect(customSend).toHaveBeenCalledTimes(1);
        expect(signal.aborted).toBe(false);
        expect(
          store.getState().assistantInputState.stopStreamingButtonState
            .isVisible
        ).toBe(true);
        resolveA();
        await Promise.all([sendA, sendB]);
        expect(customSend).toHaveBeenCalledTimes(2);
      }
    );

    it('retains stop controls until the last streaming snapshot is removed', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      await instance.messaging.upsertMessage(
        'one',
        MessageState.STREAMING,
        () => cancellableResponse('one')
      );
      await instance.messaging.upsertMessage(
        'two',
        MessageState.STREAMING,
        () => cancellableResponse('two')
      );
      await instance.messaging.removeMessages(['one']);
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(true);
      await instance.messaging.removeMessages(['two']);
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(false);
    });

    it('shares stream-start announcements with chunks and announces final text', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const dispatch = jest.spyOn(store, 'dispatch');
      await instance.messaging.upsertMessage(
        'announced',
        MessageState.STREAMING,
        () => cancellableResponse('announced')
      );
      await instance.messaging.upsertMessage(
        'announced',
        MessageState.STREAMING,
        (previous) => previous
      );
      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'announced' },
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          text: ' tail',
          streaming_metadata: { id: 'text' },
        },
      });
      expect(
        dispatch.mock.calls.filter(
          ([action]) =>
            action.type === 'ANNOUNCE_MESSAGE' &&
            (action.message as { messageID?: string })?.messageID ===
              'messages_streamingStart'
        )
      ).toHaveLength(1);
      await instance.messaging.upsertMessage(
        'announced',
        MessageState.COMPLETE,
        (previous) => previous
      );
      const item = Object.values(store.getState().allMessageItemsByID).find(
        (item) => item.fullMessageID === 'announced'
      );
      expect(item.ui_state.streamingState.isDone).toBe(true);
    });
  });

  it('retries receive after a terminal user-defined slot handler rejects', async () => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const receive = jest.fn();
    instance.on({ type: BusEventType.RECEIVE, handler: receive });
    await instance.messaging.upsertMessage(
      'retry',
      MessageState.STREAMING,
      () => userDefinedResponse('retry', { text: 'partial' })
    );
    const handler = jest.spyOn(
      serviceManager.actions,
      'handleUserDefinedResponseItems'
    );
    handler.mockRejectedValueOnce(new Error('slot failed'));
    await expect(
      instance.messaging.upsertMessage('retry', MessageState.COMPLETE, () =>
        userDefinedResponse('retry', { text: 'final' })
      )
    ).rejects.toThrow('slot failed');
    expect(receive).not.toHaveBeenCalled();
    expect(serviceManager.messageUpsertCoordinator.hasStreamingMessages()).toBe(
      false
    );
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
    await instance.messaging.upsertMessage('retry', MessageState.COMPLETE, () =>
      userDefinedResponse('retry', { text: 'final' })
    );
    expect(receive).toHaveBeenCalledTimes(1);
  });

  describe('human-agent upserts', () => {
    function connectResponse(): MessageResponse {
      return {
        id: 'handoff',
        output: {
          generic: [
            { response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT },
          ],
        },
      };
    }

    async function setupHandoff(
      availability = Promise.resolve(HumanAgentsOnlineStatus.ONLINE)
    ) {
      const config = createBaseConfig();
      config.serviceDesk = { skipConnectHumanAgentCard: true };
      const rendered = await renderChatAndGetInstanceWithStore(config);
      const { humanAgentService } = rendered.serviceManager;
      jest
        .spyOn(humanAgentService, 'checkAreAnyHumanAgentsOnline')
        .mockImplementation(() => availability);
      jest.spyOn(humanAgentService, 'startChat').mockResolvedValue(undefined);
      jest
        .spyOn(rendered.serviceManager.actions, 'errorOccurred')
        .mockImplementation(() => undefined);
      return { ...rendered, humanAgentService };
    }

    it('starts handoff only once across unchanged and changed complete snapshots', async () => {
      const { instance, humanAgentService } = await setupHandoff();
      await instance.messaging.upsertMessage(
        'handoff',
        MessageState.STREAMING,
        connectResponse
      );
      expect(humanAgentService.startChat).not.toHaveBeenCalled();
      await instance.messaging.upsertMessage(
        'handoff',
        MessageState.COMPLETE,
        connectResponse
      );
      await instance.messaging.upsertMessage(
        'handoff',
        MessageState.COMPLETE,
        connectResponse
      );
      await instance.messaging.upsertMessage(
        'handoff',
        MessageState.COMPLETE,
        () => ({
          ...connectResponse(),
          thread_id: 'updated-thread',
        })
      );
      expect(
        humanAgentService.checkAreAnyHumanAgentsOnline
      ).toHaveBeenCalledTimes(1);
      expect(humanAgentService.startChat).toHaveBeenCalledTimes(1);
    });

    it('preserves generated offline and missing-service-desk metadata across snapshots', async () => {
      const { instance, store, humanAgentService } = await setupHandoff(
        Promise.resolve(HumanAgentsOnlineStatus.OFFLINE)
      );
      await instance.messaging.upsertMessage(
        'handoff',
        MessageState.COMPLETE,
        connectResponse
      );
      await instance.messaging.upsertMessage(
        'handoff',
        MessageState.COMPLETE,
        connectResponse
      );
      expect(
        store.getState().allMessagesByID.handoff.ui_state_internal
      ).toMatchObject({
        agent_availability: HumanAgentsOnlineStatus.OFFLINE,
        agent_no_service_desk: true,
      });
      expect(humanAgentService.startChat).not.toHaveBeenCalled();
    });

    it('does not connect or emit receive after restart during the availability check', async () => {
      let resolveAvailability: (status: HumanAgentsOnlineStatus) => void;
      const availability = new Promise<HumanAgentsOnlineStatus>((resolve) => {
        resolveAvailability = resolve;
      });
      const { instance, store, serviceManager, humanAgentService } =
        await setupHandoff(availability);
      const receive = jest.fn();
      instance.on({ type: BusEventType.RECEIVE, handler: receive });
      const pending = instance.messaging.upsertMessage(
        'handoff',
        MessageState.COMPLETE,
        connectResponse
      );
      await waitFor(() =>
        expect(
          humanAgentService.checkAreAnyHumanAgentsOnline
        ).toHaveBeenCalledTimes(1)
      );
      await serviceManager.actions.restartConversation({ skipHydration: true });
      resolveAvailability(HumanAgentsOnlineStatus.ONLINE);
      await pending;
      expect(humanAgentService.startChat).not.toHaveBeenCalled();
      expect(receive).not.toHaveBeenCalled();
      expect(store.getState().allMessagesByID.handoff).toBeUndefined();
    });
  });

  it('accepts a frozen addMessage snapshot as an unchanged upsert result', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await instance.messaging.addMessage(textResponse('frozen', 'hello'));
    const previous = store.getState().allMessagesByID.frozen;
    expect(Object.isFrozen(previous)).toBe(true);
    await expect(
      instance.messaging.upsertMessage(
        'frozen',
        MessageState.COMPLETE,
        (message) => message
      )
    ).resolves.toBeUndefined();
    expect(store.getState().allMessagesByID.frozen).toEqual(previous);
  });

  describe('store integration', () => {
    it('inserts a brand-new message via upsert', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.upsertMessage(
        'upsert-1',
        MessageState.COMPLETE,
        () => textResponse('upsert-1', 'hello')
      );

      const state = store.getState();
      expect(state.allMessagesByID['upsert-1']).toBeDefined();
      expect(
        (state.allMessagesByID['upsert-1'] as any).output.generic[0].text
      ).toBe('hello');
    });

    it('updates the stored message text on a follow-up COMPLETE upsert', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.upsertMessage('u2', MessageState.STREAMING, () =>
        textResponse('u2', 'v1')
      );
      await instance.messaging.upsertMessage('u2', MessageState.COMPLETE, () =>
        textResponse('u2', 'v2')
      );

      const state = store.getState();
      expect((state.allMessagesByID['u2'] as any).output.generic[0].text).toBe(
        'v2'
      );
    });
  });

  describe('pre:receive / receive firing predicate', () => {
    it('fires pre:receive and receive on undefined → COMPLETE', async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preReceive = jest.fn();
      const receive = jest.fn();
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);

      await instance.messaging.upsertMessage('u3', MessageState.COMPLETE, () =>
        textResponse('u3', 'done')
      );

      expect(preReceive).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledTimes(1);
    });

    it('does not fire on STREAMING; fires once on the final COMPLETE', async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preReceive = jest.fn();
      const receive = jest.fn();
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);

      await instance.messaging.upsertMessage('u4', MessageState.STREAMING, () =>
        textResponse('u4', 'a')
      );
      await instance.messaging.upsertMessage('u4', MessageState.STREAMING, () =>
        textResponse('u4', 'ab')
      );
      expect(preReceive).not.toHaveBeenCalled();
      expect(receive).not.toHaveBeenCalled();

      await instance.messaging.upsertMessage('u4', MessageState.COMPLETE, () =>
        textResponse('u4', 'abc')
      );

      expect(preReceive).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledTimes(1);
    });

    it('does not fire when upserting COMPLETE onto an already-COMPLETE message produced by addMessage', async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage(textResponse('u5', 'v1'));

      const preReceive = jest.fn();
      const receive = jest.fn();
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);

      await instance.messaging.upsertMessage('u5', MessageState.COMPLETE, () =>
        textResponse('u5', 'v2')
      );

      expect(preReceive).not.toHaveBeenCalled();
      expect(receive).not.toHaveBeenCalled();
    });
  });

  describe('USER_DEFINED_RESPONSE event integration', () => {
    it('fires USER_DEFINED_RESPONSE with the state from the upsert call', async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const handler = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler,
      });

      await instance.messaging.upsertMessage('u6', MessageState.STREAMING, () =>
        userDefinedResponse('u6', { foo: 'bar' })
      );

      expect(handler).toHaveBeenCalled();
      const event = handler.mock.calls[0][0];
      expect(event.type).toBe(BusEventType.USER_DEFINED_RESPONSE);
      expect(event.data.state).toBe(MessageState.STREAMING);
    });

    it('populates state on USER_DEFINED_RESPONSE fired from addMessage with MessageState.COMPLETE', async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const handler = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler,
      });

      await instance.messaging.addMessage(
        userDefinedResponse('u7', { foo: 'bar' })
      );

      expect(handler).toHaveBeenCalled();
      const event = handler.mock.calls[0][0];
      expect(event.data.state).toBe(MessageState.COMPLETE);
    });

    it('does NOT re-fire USER_DEFINED_RESPONSE when the item is deep-equal across upserts', async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const handler = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler,
      });

      const payload = { foo: 'bar' };
      await instance.messaging.upsertMessage('u8', MessageState.STREAMING, () =>
        userDefinedResponse('u8', payload)
      );
      expect(handler).toHaveBeenCalledTimes(1);

      // Same payload again — coordinator should detect that LocalMessageItem reference
      // was reused and suppress the event.
      await instance.messaging.upsertMessage('u8', MessageState.STREAMING, () =>
        userDefinedResponse('u8', payload)
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('input validation', () => {
    it('rejects with TypeError when updater returns undefined', async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const badUpdater = ((): undefined => undefined) as any;
      await expect(
        instance.messaging.upsertMessage(
          'u9',
          MessageState.COMPLETE,
          badUpdater
        )
      ).rejects.toThrow(TypeError);
    });

    it('rejects when updater returns a message with a mismatched id', async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      await expect(
        instance.messaging.upsertMessage('u10', MessageState.COMPLETE, () =>
          textResponse('not-u10', '')
        )
      ).rejects.toThrow(/but call was for/i);
    });

    it('assigns messageID when the returned message has no id', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      await instance.messaging.upsertMessage(
        'u11',
        MessageState.COMPLETE,
        () => ({
          output: {
            generic: [{ response_type: MessageResponseTypes.TEXT, text: 'hi' }],
          },
        })
      );
      const state = store.getState();
      expect(state.allMessagesByID['u11']).toBeDefined();
    });
  });
});
