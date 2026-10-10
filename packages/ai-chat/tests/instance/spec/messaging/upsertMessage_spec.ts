/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
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
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import actions from '../../../../src/chat/store/actions';
import { OnErrorType } from '../../../../src/types/config/ErrorConfig';
import {
  HumanAgentsOnlineStatus,
  ServiceDesk,
} from '../../../../src/types/config/ServiceDeskConfig';
import { ViewType } from '../../../../src/types/instance/apiTypes';

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
    it('records a restarted stream before a slot handler rejects', async () => {
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      await instance.messaging.upsertMessage(
        'slot-rejection',
        MessageState.COMPLETE,
        () => textResponse('slot-rejection', 'Original answer')
      );
      const preReceive = jest.fn();
      const receive = jest.fn();
      const slot = jest.fn().mockRejectedValueOnce(new Error('Slot failed'));
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
        { type: BusEventType.USER_DEFINED_RESPONSE, handler: slot },
      ]);

      await expect(
        instance.messaging.upsertMessage(
          'slot-rejection',
          MessageState.STREAMING,
          () => userDefinedResponse('slot-rejection', { text: 'New answer' })
        )
      ).rejects.toThrow('Slot failed');
      expect(
        serviceManager.messageUpsertCoordinator.getState('slot-rejection')
      ).toBe(MessageState.STREAMING);

      await instance.messaging.upsertMessage(
        'slot-rejection',
        MessageState.COMPLETE,
        (previous) => previous
      );
      expect(preReceive).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledTimes(1);
    });

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

    it('settles all current snapshots when stopped after customSendMessage resolves', async () => {
      const config = createBaseConfig();
      config.messaging.customSendMessage = async (_request, _options, chat) => {
        await chat.messaging.upsertMessage(
          'early',
          MessageState.STREAMING,
          () => cancellableResponse('early')
        );
      };
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);
      await instance.send('start');
      await serviceManager.messageService.cancelCurrentMessageRequest();
      expect(
        serviceManager.messageUpsertCoordinator.hasStreamingMessages()
      ).toBe(false);
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(false);
      const item = Object.values(store.getState().allMessageItemsByID).find(
        (item) => item.fullMessageID === 'early'
      );
      expect(item.ui_state.streamingState.isDone).toBe(true);
      expect(item.ui_state.isIntermediateStreaming).toBeUndefined();
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

    it('keeps the unchanged children of a changed card by reference, and every child’s id', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const card = (id: string, bodyText: string): MessageResponse => ({
        id,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.CARD,
              body: [
                { response_type: MessageResponseTypes.TEXT, text: 'Title' },
                { response_type: MessageResponseTypes.TEXT, text: bodyText },
              ],
            } as any,
          ],
        },
      });
      const children = () => {
        const state = store.getState();
        const [cardID] = state.assistantMessageState.localMessageIDs.filter(
          (id) => state.allMessageItemsByID[id].fullMessageID === 'u-card'
        );
        return state.allMessageItemsByID[
          cardID
        ].ui_state.bodyLocalMessageItemIDs.map(
          (id) => state.allMessageItemsByID[id]
        );
      };

      await instance.messaging.upsertMessage(
        'u-card',
        MessageState.STREAMING,
        () => card('u-card', 'Draft')
      );
      const before = children();
      await instance.messaging.upsertMessage(
        'u-card',
        MessageState.STREAMING,
        () => card('u-card', 'Draft, longer')
      );
      const edited = children();
      await instance.messaging.upsertMessage(
        'u-card',
        MessageState.COMPLETE,
        () => card('u-card', 'Final')
      );
      const completed = children();

      expect(edited[0]).toBe(before[0]);
      expect(edited[1]).not.toBe(before[1]);
      expect(edited.map((child) => child.ui_state.id)).toEqual(
        before.map((child) => child.ui_state.id)
      );
      expect(completed.map((child) => child.ui_state.id)).toEqual(
        before.map((child) => child.ui_state.id)
      );
      expect((completed[1].item as any).text).toBe('Final');

      // M6: nested items settle with isDone: true when the parent message reaches COMPLETE.
      expect(
        completed.every(
          (child) => child.ui_state.streamingState?.isDone === true
        )
      ).toBe(true);
    });

    it('preserves the message reference across a no-change STREAMING upsert (A8)', async () => {
      // keepMessageRefIfUnchanged returns the previous stored message when the updater
      // returns a deep-equal object AND every local item was reused. The easiest way
      // to guarantee deep-equality across calls is to return the already-stored message
      // from the second updater (the updater receives `prev`).
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());

      await instance.messaging.upsertMessage(
        'u-ref',
        MessageState.STREAMING,
        () => ({
          id: 'u-ref',
          output: {
            generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Hi' }],
          },
        })
      );
      const refAfterFirst = store.getState().allMessagesByID['u-ref'];
      expect(refAfterFirst).toBeDefined();

      // Return the same stored message object — deep-equal AND same reference, so every
      // local item is reused and keepMessageRefIfUnchanged returns prevMessage.
      await instance.messaging.upsertMessage(
        'u-ref',
        MessageState.STREAMING,
        (prev) => prev
      );
      expect(store.getState().allMessagesByID['u-ref']).toBe(refAfterFirst);
    });

    it('replaces a chunk partial in allMessagesByID when upsertMessage(STREAMING) runs for the same id (I7)', async () => {
      // D18: during a chunk stream the stored message is the STREAMING_START placeholder
      // with empty output.generic. A upsertMessage(STREAMING) for the same id wins the
      // per-id chain and replaces the partial with a defaults-stamped full message.
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const id = 'i7-mixed';

      // Start a chunk stream — this stores the placeholder.
      await instance.messaging.addMessageChunk({
        id,
        response_type: 'start',
      } as any);

      const afterChunk = store.getState().allMessagesByID[id] as any;
      expect(afterChunk?.output?.generic ?? []).toHaveLength(0);

      // Now upsert the same id via upsertMessage(STREAMING) — this replaces the partial.
      await instance.messaging.upsertMessage(
        id,
        MessageState.STREAMING,
        () => ({
          id,
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: 'Upserted' },
            ],
          },
        })
      );

      const afterUpsert = store.getState().allMessagesByID[id] as any;
      // The upsert wins: the stored message now has the upserted content, not the chunk partial.
      expect(afterUpsert?.output?.generic).toHaveLength(1);
      expect((afterUpsert.output.generic[0] as any).text).toBe('Upserted');
    });

    it('remounts a nested item that gains streaming_metadata.id in a later upsert (M7 — current behavior)', async () => {
      // matchNestedLocalIDs uses streaming_metadata.id for identity when present.
      // A nested item that had no id in the first upsert and gains one in the second
      // currently gets a new local id and remounts. This pin documents that behavior.
      // If it changes (keeping the id), change the assertion at the end of this test.
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const card = (nestedStreamId?: string): MessageResponse => ({
        id: 'm7-card',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.CARD,
              body: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Body',
                  ...(nestedStreamId
                    ? { streaming_metadata: { id: nestedStreamId } }
                    : {}),
                },
              ],
            } as any,
          ],
        },
      });

      await instance.messaging.upsertMessage(
        'm7-card',
        MessageState.STREAMING,
        () => card()
      );
      const childID = () => {
        const state = store.getState();
        const [cardLocal] = state.assistantMessageState.localMessageIDs.filter(
          (id) => state.allMessageItemsByID[id]?.fullMessageID === 'm7-card'
        );
        const bodyIDs =
          state.allMessageItemsByID[cardLocal]?.ui_state
            .bodyLocalMessageItemIDs ?? [];
        return bodyIDs[0];
      };
      const idBefore = childID();
      expect(idBefore).toBeDefined();

      // Second upsert: same nested item, but now with a streaming_metadata.id.
      // The position-fallback in matchNestedLocalIDs is skipped because the new item
      // now has a streaming_metadata.id — so a fresh local id is assigned (remount).
      await instance.messaging.upsertMessage(
        'm7-card',
        MessageState.COMPLETE,
        () => card('body-0')
      );
      expect(childID()).not.toBe(idBefore);
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

  describe('stop streaming button', () => {
    function cancellableResponse(id: string, text: string): MessageResponse {
      return {
        id,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text,
              streaming_metadata: { id: '1', cancellable: true },
            },
          ],
        },
      };
    }

    const isVisible = (store: { getState: () => any }) =>
      store.getState().assistantInputState.stopStreamingButtonState.isVisible;

    it.each([MessageState.COMPLETE, MessageState.ERROR])(
      'updates cancellation metadata and clears disablement on %s',
      async (terminalState) => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const write = (
          cancellable?: boolean,
          state = MessageState.STREAMING
        ) => {
          const response = cancellableResponse('cancellation-flags', 'Partial');
          response.output.generic[0].streaming_metadata.cancellable =
            cancellable;
          return instance.messaging.upsertMessage(
            response.id,
            state,
            () => response
          );
        };
        const buttonState = () =>
          store.getState().assistantInputState.stopStreamingButtonState;

        await write(false);
        expect(buttonState()).toMatchObject({
          isVisible: false,
          isMetadataDisabled: false,
        });
        await write(true);
        expect(buttonState()).toMatchObject({
          isVisible: true,
          isMetadataDisabled: false,
        });
        await write(false);
        expect(buttonState()).toMatchObject({
          isVisible: true,
          isMetadataDisabled: true,
        });
        await write();
        expect(buttonState().isMetadataDisabled).toBe(true);
        await write(true);
        expect(buttonState().isMetadataDisabled).toBe(false);
        await write(false);
        await write(false, terminalState);
        expect(buttonState()).toMatchObject({
          isVisible: false,
          isDisabled: false,
          isMetadataDisabled: false,
        });
        await write(true);
        expect(buttonState()).toMatchObject({
          isVisible: true,
          isMetadataDisabled: false,
        });
      }
    );

    it('lets an explicit false win over true in a mixed snapshot', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      await instance.messaging.upsertMessage(
        'mixed-flags',
        MessageState.STREAMING,
        () => cancellableResponse('mixed-flags', 'Partial')
      );
      const mixed = cancellableResponse('mixed-flags', 'Partial');
      mixed.output.generic.push({
        response_type: MessageResponseTypes.TEXT,
        text: 'Cannot interrupt',
        streaming_metadata: { id: '2', cancellable: false },
      });
      await instance.messaging.upsertMessage(
        mixed.id,
        MessageState.STREAMING,
        () => mixed
      );
      expect(
        store.getState().assistantInputState.stopStreamingButtonState
      ).toMatchObject({
        isVisible: true,
        isMetadataDisabled: true,
      });
      await instance.messaging.upsertMessage(
        mixed.id,
        MessageState.STREAMING,
        () => cancellableResponse(mixed.id, 'Can interrupt')
      );
      expect(
        store.getState().assistantInputState.stopStreamingButtonState
          .isMetadataDisabled
      ).toBe(false);
    });

    it('shows the button on a cancellable streaming upsert', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());

      expect(isVisible(store)).toBe(false);

      await instance.messaging.upsertMessage(
        'stop-1',
        MessageState.STREAMING,
        () => cancellableResponse('stop-1', 'partial')
      );

      expect(isVisible(store)).toBe(true);
    });

    it('hides the button once the message completes', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());

      await instance.messaging.upsertMessage(
        'stop-2',
        MessageState.STREAMING,
        () => cancellableResponse('stop-2', 'partial')
      );
      expect(isVisible(store)).toBe(true);

      await instance.messaging.upsertMessage(
        'stop-2',
        MessageState.COMPLETE,
        () => cancellableResponse('stop-2', 'all of it')
      );

      expect(isVisible(store)).toBe(false);
    });

    it('hides the button when the message errors', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());

      await instance.messaging.upsertMessage(
        'stop-3',
        MessageState.STREAMING,
        () => cancellableResponse('stop-3', 'partial')
      );
      expect(isVisible(store)).toBe(true);

      await instance.messaging.upsertMessage('stop-3', MessageState.ERROR, () =>
        cancellableResponse('stop-3', 'partial')
      );

      expect(isVisible(store)).toBe(false);
    });

    it('leaves the button hidden when the message is not cancellable', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());

      await instance.messaging.upsertMessage(
        'stop-4',
        MessageState.STREAMING,
        () => textResponse('stop-4', 'partial')
      );

      expect(isVisible(store)).toBe(false);
    });

    describe('with more than one message streaming', () => {
      it('keeps a hidden response protected when another request shows stop immediately', async () => {
        let finishSend: () => void;
        const pendingSend = new Promise<void>((resolve) => {
          finishSend = resolve;
        });
        const config = createBaseConfig();
        config.messaging = {
          showStopButtonImmediately: true,
          customSendMessage: () => pendingSend,
        };
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(config);
        const blocked = cancellableResponse(
          'hidden-blocked',
          'Cannot interrupt'
        );
        blocked.output.generic[0].streaming_metadata.cancellable = false;
        await instance.messaging.upsertMessage(
          blocked.id,
          MessageState.STREAMING,
          () => blocked
        );
        expect(isVisible(store)).toBe(false);
        const send = instance.send('Another request');
        try {
          await waitFor(() => expect(isVisible(store)).toBe(true));
          expect(
            store.getState().assistantInputState.stopStreamingButtonState
              .isMetadataDisabled
          ).toBe(true);
        } finally {
          finishSend();
          await send;
        }
      });

      it.each(['complete', 'error', 'remove', 'addMessage'])(
        'keeps another response protected until its %s',
        async (finish) => {
          const { instance, store } =
            await renderChatAndGetInstanceWithStore(createBaseConfig());
          const response = (id: string, cancellable?: boolean) => {
            const message = cancellableResponse(id, 'Partial');
            message.output.generic[0].streaming_metadata.cancellable =
              cancellable;
            return message;
          };
          await instance.messaging.upsertMessage(
            'blocked',
            MessageState.STREAMING,
            () => response('blocked', false)
          );
          await instance.messaging.upsertMessage(
            'available',
            MessageState.STREAMING,
            () => response('available', true)
          );
          const button = () =>
            store.getState().assistantInputState.stopStreamingButtonState;
          expect(button()).toMatchObject({
            isVisible: true,
            isMetadataDisabled: true,
          });
          await instance.messaging.upsertMessage(
            'available',
            MessageState.STREAMING,
            () => response('available', true)
          );
          await instance.messaging.upsertMessage(
            'blocked',
            MessageState.STREAMING,
            () => response('blocked')
          );
          expect(button().isMetadataDisabled).toBe(true);

          if (finish === 'remove') {
            await instance.messaging.removeMessages(['blocked']);
          } else if (finish === 'addMessage') {
            await instance.messaging.addMessage(response('blocked', false));
          } else {
            await instance.messaging.upsertMessage(
              'blocked',
              finish === 'error' ? MessageState.ERROR : MessageState.COMPLETE,
              () => response('blocked', false)
            );
          }
          expect(button()).toMatchObject({
            isVisible: true,
            isMetadataDisabled: false,
          });
        }
      );

      it('requires every non-cancellable response to release its own restriction', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const write = (id: string, cancellable: boolean) => {
          const response = cancellableResponse(id, 'Partial');
          response.output.generic[0].streaming_metadata.cancellable =
            cancellable;
          return instance.messaging.upsertMessage(
            id,
            MessageState.STREAMING,
            () => response
          );
        };
        await write('available', true);
        await write('blocked-a', false);
        await write('blocked-b', false);
        await write('blocked-a', true);
        expect(
          store.getState().assistantInputState.stopStreamingButtonState
            .isMetadataDisabled
        ).toBe(true);
        await write('blocked-b', true);
        expect(
          store.getState().assistantInputState.stopStreamingButtonState
            .isMetadataDisabled
        ).toBe(false);
      });

      it('keeps the button visible when one of two streams completes', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());

        await instance.messaging.upsertMessage(
          'multi-a',
          MessageState.STREAMING,
          () => cancellableResponse('multi-a', 'a partial')
        );
        await instance.messaging.upsertMessage(
          'multi-b',
          MessageState.STREAMING,
          () => cancellableResponse('multi-b', 'b partial')
        );
        expect(isVisible(store)).toBe(true);

        await instance.messaging.upsertMessage(
          'multi-a',
          MessageState.COMPLETE,
          () => cancellableResponse('multi-a', 'a done')
        );

        // multi-b is still streaming, so the affordance has to survive.
        expect(isVisible(store)).toBe(true);

        await instance.messaging.upsertMessage(
          'multi-b',
          MessageState.COMPLETE,
          () => cancellableResponse('multi-b', 'b done')
        );

        expect(isVisible(store)).toBe(false);
      });

      it('keeps the button visible when one of two streams errors', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());

        await instance.messaging.upsertMessage(
          'multi-err-a',
          MessageState.STREAMING,
          () => cancellableResponse('multi-err-a', 'a partial')
        );
        await instance.messaging.upsertMessage(
          'multi-err-b',
          MessageState.STREAMING,
          () => cancellableResponse('multi-err-b', 'b partial')
        );

        await instance.messaging.upsertMessage(
          'multi-err-a',
          MessageState.ERROR,
          () => cancellableResponse('multi-err-a', 'a failed')
        );

        expect(isVisible(store)).toBe(true);

        await instance.messaging.upsertMessage(
          'multi-err-b',
          MessageState.ERROR,
          () => cancellableResponse('multi-err-b', 'b failed')
        );

        expect(isVisible(store)).toBe(false);
      });

      it('does not strand the button when a terminal upsert throws', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());

        await instance.messaging.upsertMessage(
          'throw-a',
          MessageState.STREAMING,
          () => cancellableResponse('throw-a', 'a partial')
        );
        await instance.messaging.upsertMessage(
          'throw-b',
          MessageState.STREAMING,
          () => cancellableResponse('throw-b', 'b partial')
        );

        await expect(
          instance.messaging.upsertMessage(
            'throw-a',
            MessageState.COMPLETE,
            () =>
              // Returning the wrong id makes the coordinator reject.
              cancellableResponse('a-different-id', 'nope')
          )
        ).rejects.toThrow();

        // throw-a never settled, so it stays registered and holds the button up.
        expect(isVisible(store)).toBe(true);

        // The surviving stream completing must still be able to hide it once throw-a
        // is dropped, so removing throw-a has to drain its registration too.
        await instance.messaging.removeMessages(['throw-a']);
        await instance.messaging.upsertMessage(
          'throw-b',
          MessageState.COMPLETE,
          () => cancellableResponse('throw-b', 'b done')
        );

        expect(isVisible(store)).toBe(false);
      });

      it('drains streaming registrations on conversation restart', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());

        await instance.messaging.upsertMessage(
          'restart-a',
          MessageState.STREAMING,
          () => cancellableResponse('restart-a', 'partial')
        );
        expect(isVisible(store)).toBe(true);

        await instance.messaging.restartConversation();
        expect(isVisible(store)).toBe(false);

        // A fresh stream after the restart must still hide on its own completion —
        // proves restart-a's registration did not survive.
        await instance.messaging.upsertMessage(
          'restart-b',
          MessageState.STREAMING,
          () => cancellableResponse('restart-b', 'partial')
        );
        expect(isVisible(store)).toBe(true);

        await instance.messaging.upsertMessage(
          'restart-b',
          MessageState.COMPLETE,
          () => cancellableResponse('restart-b', 'done')
        );
        expect(isVisible(store)).toBe(false);
      });
    });

    describe('mixed with addMessageChunk', () => {
      const partialChunk = (responseId: string) => ({
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: `${responseId}-item`, cancellable: true },
          response_type: MessageResponseTypes.TEXT,
          text: 'chunk partial ',
        },
      });

      const finalChunk = (responseId: string) => ({
        final_response: {
          id: responseId,
          output: {
            generic: [
              {
                streaming_metadata: { id: `${responseId}-item` },
                response_type: MessageResponseTypes.TEXT,
                text: 'chunk done',
              },
            ],
          },
        },
      });

      it('keeps the button visible when the chunk stream finishes first', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());

        await instance.messaging.addMessageChunk(partialChunk('mix-c1') as any);
        await instance.messaging.upsertMessage(
          'mix-u1',
          MessageState.STREAMING,
          () => cancellableResponse('mix-u1', 'upsert partial')
        );
        expect(isVisible(store)).toBe(true);

        await instance.messaging.addMessageChunk(finalChunk('mix-c1') as any);

        // The upsert stream is still running.
        expect(isVisible(store)).toBe(true);

        await instance.messaging.upsertMessage(
          'mix-u1',
          MessageState.COMPLETE,
          () => cancellableResponse('mix-u1', 'upsert done')
        );

        expect(isVisible(store)).toBe(false);
      });

      it('keeps the button visible when the upsert stream finishes first', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());

        await instance.messaging.addMessageChunk(partialChunk('mix-c2') as any);
        await instance.messaging.upsertMessage(
          'mix-u2',
          MessageState.STREAMING,
          () => cancellableResponse('mix-u2', 'upsert partial')
        );

        await instance.messaging.upsertMessage(
          'mix-u2',
          MessageState.COMPLETE,
          () => cancellableResponse('mix-u2', 'upsert done')
        );

        // The chunk stream is still running.
        expect(isVisible(store)).toBe(true);

        await instance.messaging.addMessageChunk(finalChunk('mix-c2') as any);

        expect(isVisible(store)).toBe(false);
      });
    });

    describe('cancellation', () => {
      const itemsFor = (store: { getState: () => any }, messageID: string) =>
        Object.values(
          store.getState().allMessageItemsByID as Record<string, any>
        ).filter((item) => item.fullMessageID === messageID);

      // Cancellation looks for a victim in the chunk registry and the send queue, and an
      // upsert stream is registered in neither — so it cannot target one individually,
      // even though the id is known.
      // What it can do is settle every registered stream, which is what stops the button
      // and the items stranding when a canceled host simply stops calling.
      it('settles a streaming upsert that never receives a terminal call', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());

        await instance.messaging.upsertMessage(
          'cancel-1',
          MessageState.STREAMING,
          () => cancellableResponse('cancel-1', 'partial')
        );
        expect(isVisible(store)).toBe(true);

        const [before] = itemsFor(store, 'cancel-1');
        expect(before.ui_state.streamingState?.isDone).toBe(false);

        await (
          instance as any
        ).serviceManager.messageService.cancelCurrentMessageRequest();

        const [after] = itemsFor(store, 'cancel-1');
        expect(after.ui_state.streamingState?.isDone).toBe(true);
        expect(after.ui_state.isIntermediateStreaming).toBeUndefined();
        expect(isVisible(store)).toBe(false);
      });

      it('settles every streaming upsert, not just one', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());

        await instance.messaging.upsertMessage(
          'cancel-a',
          MessageState.STREAMING,
          () => cancellableResponse('cancel-a', 'a')
        );
        await instance.messaging.upsertMessage(
          'cancel-b',
          MessageState.STREAMING,
          () => cancellableResponse('cancel-b', 'b')
        );

        await (
          instance as any
        ).serviceManager.messageService.cancelCurrentMessageRequest();

        for (const id of ['cancel-a', 'cancel-b']) {
          const [item] = itemsFor(store, id);
          expect(item.ui_state.streamingState?.isDone).toBe(true);
        }
        expect(isVisible(store)).toBe(false);
      });
    });
  });

  // Each block below covers something addMessage has always done that upsertMessage
  // did not, so a host that only calls upsertMessage gets the same handling.
  describe('handling shared with addMessage', () => {
    // Session state (open view, home screen, hasSentNonWelcomeMessage) persists to
    // sessionStorage, which outlives each render.
    beforeEach(() => window.sessionStorage.clear());

    describe('home screen', () => {
      const renderWithOpenHomeScreen = async () => {
        const config = { ...createBaseConfig(), homescreen: { isOn: true } };
        const rendered = await renderChatAndGetInstanceWithStore(config as any);
        act(() => {
          rendered.store.dispatch(actions.setHomeScreenIsOpen(true));
        });
        const isHomeScreenOpen = () =>
          rendered.store.getState().persistedToBrowserStorage.homeScreenState
            .isHomeScreenOpen;
        expect(isHomeScreenOpen()).toBe(true);
        return { ...rendered, isHomeScreenOpen };
      };

      it('closes an open home screen on a COMPLETE upsert', async () => {
        const { instance, isHomeScreenOpen } = await renderWithOpenHomeScreen();

        await instance.messaging.upsertMessage(
          'home-complete',
          MessageState.COMPLETE,
          () => textResponse('home-complete', 'Hi')
        );

        expect(isHomeScreenOpen()).toBe(false);
      });

      it('closes an open home screen on the first STREAMING upsert', async () => {
        const { instance, isHomeScreenOpen } = await renderWithOpenHomeScreen();

        await instance.messaging.upsertMessage(
          'home-streaming',
          MessageState.STREAMING,
          () => textResponse('home-streaming', 'Hi')
        );

        expect(isHomeScreenOpen()).toBe(false);
      });
    });

    describe('history.silent', () => {
      it('stores a history.silent message but adds no local items for it', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'silent-history';

        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () => ({
            ...textResponse(id, 'Hidden'),
            history: { silent: true },
          })
        );

        const state = store.getState();
        expect(state.allMessagesByID[id]).toBeDefined();
        expect(
          Object.values(state.allMessageItemsByID).filter(
            (item) => item.fullMessageID === id
          )
        ).toHaveLength(0);
      });
    });

    describe('silent items', () => {
      const silentUserDefined = {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { silent: true },
      };
      const text = (value: string) => ({
        response_type: MessageResponseTypes.TEXT,
        text: value,
      });
      const shownItems = (store: { getState: () => any }, id: string) => {
        const state = store.getState();
        return state.assistantMessageState.localMessageIDs
          .map((localID: string) => state.allMessageItemsByID[localID])
          .filter((item: any) => item?.fullMessageID === id);
      };

      it('stores a silent user_defined item without showing it, and fires userDefinedResponse once with no slot', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const userDefined = jest.fn();
        instance.on({
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: userDefined,
        });
        const id = 'silent-user-defined';

        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () => ({
            id,
            output: { generic: [silentUserDefined, text('Visible')] },
          })
        );

        expect(
          (store.getState().allMessagesByID[id] as MessageResponse).output
            .generic
        ).toHaveLength(2);
        expect(
          shownItems(store, id).map((item: any) => item.item.text)
        ).toEqual(['Visible']);
        expect(userDefined).toHaveBeenCalledTimes(1);
        expect(userDefined.mock.calls[0][0].data.message).toEqual(
          silentUserDefined
        );
        expect(userDefined.mock.calls[0][0].data.slot).toBeUndefined();
      });

      it('keeps the local id of an item that follows a silent one across upserts', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'silent-then-text';

        await instance.messaging.upsertMessage(
          id,
          MessageState.STREAMING,
          () => ({ id, output: { generic: [silentUserDefined, text('a')] } })
        );
        const [first] = shownItems(store, id);
        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () => ({ id, output: { generic: [silentUserDefined, text('ab')] } })
        );
        const [second] = shownItems(store, id);

        expect(second.item.text).toBe('ab');
        expect(second.ui_state.id).toBe(first.ui_state.id);
      });

      it('fires userDefinedResponse for the items of a history.silent message', async () => {
        const { instance } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const userDefined = jest.fn();
        instance.on({
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: userDefined,
        });
        const id = 'silent-history-user-defined';

        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () => ({
            ...userDefinedResponse(id, { kind: 'widget' }),
            history: { silent: true },
          })
        );

        expect(userDefined).toHaveBeenCalledTimes(1);
      });

      it('keeps the slot of a history.silent item across writes', async () => {
        const { instance } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const userDefined = jest.fn();
        instance.on({
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: userDefined,
        });
        const id = 'silent-history-slot';
        const write = (count: number) =>
          instance.messaging.upsertMessage(id, MessageState.STREAMING, () => ({
            ...userDefinedResponse(id, { count }),
            history: { silent: true },
          }));

        await write(1);
        await write(2);

        expect(userDefined).toHaveBeenCalledTimes(2);
        const [first, second] = userDefined.mock.calls.map(
          (call) => call[0].data.slot
        );
        expect(first).toEqual(expect.any(String));
        expect(second).toBe(first);
      });
    });

    describe('conversation restart', () => {
      it('drops a write whose updater resolves after restartConversation', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        let release: () => void;
        const updaterGate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const id = 'restart-in-updater';

        const pending = instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          async () => {
            await updaterGate;
            return textResponse(id, 'Stale');
          }
        );
        await instance.restartConversation();
        release();
        await pending;

        expect(store.getState().allMessagesByID[id]).toBeUndefined();
      });

      it('drops a write when a pre:receive handler restarts the conversation', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const receive = jest.fn();
        let restarted = false;
        instance.on([
          {
            type: BusEventType.PRE_RECEIVE,
            handler: async () => {
              if (!restarted) {
                restarted = true;
                await instance.restartConversation();
              }
            },
          },
          { type: BusEventType.RECEIVE, handler: receive },
        ]);
        const id = 'restart-in-pre-receive';

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          textResponse(id, 'Stale')
        );

        expect(store.getState().allMessagesByID[id]).toBeUndefined();
        expect(receive).not.toHaveBeenCalled();
      });

      it('drops the rest of a write when a userDefinedResponse handler restarts the conversation', async () => {
        const { instance } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const receive = jest.fn();
        instance.on([
          {
            type: BusEventType.USER_DEFINED_RESPONSE,
            handler: () => instance.restartConversation(),
          },
          { type: BusEventType.RECEIVE, handler: receive },
        ]);
        const id = 'restart-in-user-defined';

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          userDefinedResponse(id, { kind: 'restarts' })
        );

        expect(receive).not.toHaveBeenCalled();
        expect(
          (instance as any).serviceManager.messageUpsertCoordinator.getState(id)
        ).toBeUndefined();
      });
    });

    describe('has-sent-non-welcome flag', () => {
      it('sets the flag the home screen reads once a message completes, not while it streams', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const hasSentNonWelcome = () =>
          store.getState().persistedToBrowserStorage.hasSentNonWelcomeMessage;
        const id = 'has-sent';
        expect(hasSentNonWelcome()).toBe(false);

        await instance.messaging.upsertMessage(id, MessageState.STREAMING, () =>
          textResponse(id, 'Hel')
        );
        expect(hasSentNonWelcome()).toBe(false);

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          textResponse(id, 'Hello')
        );
        expect(hasSentNonWelcome()).toBe(true);
      });
    });

    describe('fan-out when a message completes', () => {
      const footerUserDefined = {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { kind: 'widget' },
        message_item_options: {
          custom_footer_slot: { slot_name: 'complete-footer' },
        },
      };

      const listen = (instance: any) => {
        const userDefined = jest.fn();
        const customFooterSlot = jest.fn();
        instance.on([
          { type: BusEventType.USER_DEFINED_RESPONSE, handler: userDefined },
          { type: BusEventType.CUSTOM_FOOTER_SLOT, handler: customFooterSlot },
        ]);
        const states = () =>
          userDefined.mock.calls.map((call: any[]) => call[0].data.state);
        return { userDefined, customFooterSlot, states };
      };

      const silentMessage = (id: string) => () => ({
        id,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { silent: true },
            },
          ],
        },
      });

      // A regression guard, not proof of the every-item rule: completing a streamed
      // message already rebuilt its items, because their streaming state changes.
      it('keeps firing a streamed item with state COMPLETE when its message completes unchanged', async () => {
        const { instance } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const { customFooterSlot, states } = listen(instance);
        const id = 'complete-unchanged';
        const message = () => ({
          id,
          output: { generic: [footerUserDefined] },
        });

        await instance.messaging.upsertMessage(
          id,
          MessageState.STREAMING,
          message
        );
        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          message
        );

        expect(states()).toEqual([
          MessageState.STREAMING,
          MessageState.COMPLETE,
        ]);
        expect(customFooterSlot).toHaveBeenCalledTimes(2);

        // A later COMPLETE with nothing changed fires nothing.
        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          message
        );
        expect(states()).toHaveLength(2);
      });

      it('fires a silent item again with state COMPLETE when its message completes unchanged', async () => {
        const { instance } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const { states } = listen(instance);
        const id = 'complete-silent-unchanged';
        const message = silentMessage(id);

        await instance.messaging.upsertMessage(
          id,
          MessageState.STREAMING,
          message
        );
        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          message
        );

        expect(states()).toEqual([
          MessageState.STREAMING,
          MessageState.COMPLETE,
        ]);
      });

      // The proof for shown items: nothing about this item changes between the two
      // writes, so only the every-item rule fires it again.
      it('fires an unchanged shown item again with state COMPLETE when an errored message completes', async () => {
        const { instance } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const { customFooterSlot, states } = listen(instance);
        const id = 'complete-after-error';
        const message = () => ({
          id,
          output: { generic: [footerUserDefined] },
        });

        await instance.messaging.upsertMessage(id, MessageState.ERROR, message);
        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          message
        );

        expect(states()).toEqual([MessageState.ERROR, MessageState.COMPLETE]);
        expect(customFooterSlot).toHaveBeenCalledTimes(2);
      });

      it('fires a silent item again with state ERROR when its streamed message errors unchanged', async () => {
        const { instance } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const { states } = listen(instance);
        const id = 'error-silent-unchanged';
        const message = silentMessage(id);

        await instance.messaging.upsertMessage(
          id,
          MessageState.STREAMING,
          message
        );
        await instance.messaging.upsertMessage(id, MessageState.ERROR, message);
        // A second ERROR with nothing changed fires nothing.
        await instance.messaging.upsertMessage(id, MessageState.ERROR, message);

        expect(states()).toEqual([MessageState.STREAMING, MessageState.ERROR]);
      });
    });

    describe('stream start announcements', () => {
      /** Records the language key of every announcement the chat makes. */
      const recordAnnouncements = (store: any) => {
        const keys: string[] = [];
        let last = store.getState().announceMessage;
        store.subscribe(() => {
          const current = store.getState().announceMessage;
          if (current && current !== last) {
            keys.push(current.messageID);
          }
          last = current;
        });
        const starts = () =>
          keys.filter(
            (key) =>
              key === 'messages_streamingStart' ||
              key === 'messages_reasoningStart'
          );
        return starts;
      };

      it('announces reasoning start and streaming start once each per message', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const starts = recordAnnouncements(store);
        const id = 'announce-starts';
        const withReasoning = (text: string) => ({
          ...textResponse(id, text),
          message_options: {
            reasoning: { steps: [{ title: 'Thinking' }] },
          },
        });

        await instance.messaging.upsertMessage(id, MessageState.STREAMING, () =>
          textResponse(id, ' ')
        );
        expect(starts()).toEqual([]);

        await instance.messaging.upsertMessage(id, MessageState.STREAMING, () =>
          withReasoning(' ')
        );
        expect(starts()).toEqual(['messages_reasoningStart']);

        await instance.messaging.upsertMessage(id, MessageState.STREAMING, () =>
          withReasoning('Hel')
        );
        await instance.messaging.upsertMessage(id, MessageState.STREAMING, () =>
          withReasoning('Hello')
        );
        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          withReasoning('Hello there')
        );
        expect(starts()).toEqual([
          'messages_reasoningStart',
          'messages_streamingStart',
        ]);
      });

      const textChunk = (id: string, text: string, reasoning?: unknown) =>
        ({
          streaming_metadata: { response_id: id },
          ...(reasoning
            ? { partial_response: { message_options: { reasoning } } }
            : {}),
          partial_item: {
            streaming_metadata: { id: 'a' },
            response_type: MessageResponseTypes.TEXT,
            text,
          },
        }) as any;

      it('announces each start once for a message addMessageChunk starts and upsertMessage continues', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const starts = recordAnnouncements(store);
        const id = 'announce-mixed';
        const reasoning = { steps: [{ title: 'Thinking' }] };

        // The chunk carries reasoning but no text yet, so only the upsert can announce
        // streaming start.
        await instance.messaging.addMessageChunk(textChunk(id, ' ', reasoning));
        expect(starts()).toEqual(['messages_reasoningStart']);

        await instance.messaging.upsertMessage(
          id,
          MessageState.STREAMING,
          () => ({
            ...textResponse(id, 'Hello'),
            message_options: { reasoning },
          })
        );
        const expected = ['messages_reasoningStart', 'messages_streamingStart'];
        expect(starts()).toEqual(expected);

        await instance.messaging.addMessageChunk(textChunk(id, 'Hello there'));
        expect(starts()).toEqual(expected);
      });

      it('announces streaming start once for a message upsertMessage starts and addMessageChunk continues', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const starts = recordAnnouncements(store);
        const id = 'announce-mixed-reverse';

        await instance.messaging.upsertMessage(id, MessageState.STREAMING, () =>
          textResponse(id, 'Hel')
        );
        expect(starts()).toEqual(['messages_streamingStart']);

        await instance.messaging.addMessageChunk(textChunk(id, 'lo'));
        await instance.messaging.addMessageChunk(textChunk(id, ' there'));

        expect(starts()).toEqual(['messages_streamingStart']);
      });

      it('does not announce streaming start while a pause holds the content back', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const starts = recordAnnouncements(store);
        const id = 'announce-after-pause';

        const write = instance.messaging.upsertMessage(
          id,
          MessageState.STREAMING,
          () =>
            ({
              id,
              output: {
                generic: [
                  {
                    response_type: MessageResponseTypes.PAUSE,
                    time: 400,
                    typing: true,
                  },
                  { response_type: MessageResponseTypes.TEXT, text: 'Hello' },
                ],
              },
            }) as MessageResponse
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(starts()).toEqual([]);

        await write;
        expect(starts()).toEqual(['messages_streamingStart']);
      });

      it('does not announce streaming start for a message upserted COMPLETE', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const starts = recordAnnouncements(store);
        const id = 'announce-complete-only';

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          textResponse(id, 'Hello')
        );

        expect(starts()).toEqual([]);
      });
    });

    describe('item announcements', () => {
      /**
       * Records every change to the needsAnnouncement flag of each item of the message,
       * keyed by the item's text position. A true -> false edge is MessageComponent
       * calling the aria announcer and marking the item announced.
       */
      const recordAnnouncementFlags = (store: any, messageID: string) => {
        const history: Record<string, boolean[]> = {};
        const unsubscribe = store.subscribe(() => {
          const state = store.getState();
          state.assistantMessageState.localMessageIDs
            .map((localID: string) => state.allMessageItemsByID[localID])
            .filter((item: any) => item?.fullMessageID === messageID)
            .forEach((item: any) => {
              const seen = (history[item.ui_state.id] ??= []);
              const value = item.ui_state.needsAnnouncement;
              if (value !== undefined && seen[seen.length - 1] !== value) {
                seen.push(value);
              }
            });
        });
        return { history, unsubscribe };
      };

      const message = (id: string, texts: string[]): MessageResponse => ({
        id,
        output: {
          generic: texts.map((text) => ({
            response_type: MessageResponseTypes.TEXT,
            text,
          })),
        },
      });

      it('announces each streamed item once, after the message completes', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'announce-streamed';
        const { history, unsubscribe } = recordAnnouncementFlags(store, id);

        for (const texts of [
          ['F', 'S'],
          ['Fi', 'Se'],
          ['Fir', 'Sec'],
        ]) {
          await instance.messaging.upsertMessage(
            id,
            MessageState.STREAMING,
            () => message(id, texts)
          );
        }
        await waitFor(() => expect(Object.keys(history)).toHaveLength(2));
        Object.values(history).forEach((flags) =>
          expect(flags).toEqual([false])
        );

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          message(id, ['First', 'Second'])
        );

        await waitFor(() =>
          Object.values(history).forEach((flags) =>
            expect(flags).toEqual([false, true, false])
          )
        );
        unsubscribe();
      });

      it('announces each streamed item once when the message errors, and not again on a later ERROR', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'announce-errored';
        const { history, unsubscribe } = recordAnnouncementFlags(store, id);

        await instance.messaging.upsertMessage(id, MessageState.STREAMING, () =>
          message(id, ['F', 'S'])
        );
        await waitFor(() => expect(Object.keys(history)).toHaveLength(2));

        await instance.messaging.upsertMessage(id, MessageState.ERROR, () =>
          message(id, ['Fi', 'Se'])
        );
        await waitFor(() =>
          Object.values(history).forEach((flags) =>
            expect(flags).toEqual([false, true, false])
          )
        );

        await instance.messaging.upsertMessage(id, MessageState.ERROR, () =>
          message(id, ['Fir', 'Sec'])
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
        Object.values(history).forEach((flags) =>
          expect(flags).toEqual([false, true, false])
        );
        unsubscribe();
      });

      it('announces each item of a single COMPLETE upsert once', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'announce-complete';
        const { history, unsubscribe } = recordAnnouncementFlags(store, id);

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          message(id, ['First', 'Second'])
        );

        await waitFor(() => {
          expect(Object.keys(history)).toHaveLength(2);
          Object.values(history).forEach((flags) =>
            expect(flags).toEqual([true, false])
          );
        });
        unsubscribe();
      });

      it('announces only the added item when a completed message changes', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'announce-changed';
        const { history, unsubscribe } = recordAnnouncementFlags(store, id);

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          message(id, ['First', 'Second'])
        );
        await waitFor(() =>
          Object.values(history).forEach((flags) =>
            expect(flags).toEqual([true, false])
          )
        );
        const existingIDs = Object.keys(history);

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          message(id, ['First, edited', 'Second', 'Third'])
        );

        await waitFor(() => expect(Object.keys(history)).toHaveLength(3));
        const [addedID] = Object.keys(history).filter(
          (localID) => !existingIDs.includes(localID)
        );
        await waitFor(() => expect(history[addedID]).toEqual([true, false]));
        existingIDs.forEach((localID) =>
          expect(history[localID]).toEqual([true, false])
        );
        unsubscribe();
      });
    });

    describe('connect_to_agent', () => {
      const connectToAgent = {
        response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
        message_to_human_agent: 'The user needs help',
      };
      const connectMessage = (id: string, extraText?: string) =>
        ({
          id,
          output: {
            generic: [
              connectToAgent,
              ...(extraText
                ? [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: extraText,
                    },
                  ]
                : []),
            ],
          },
        }) as MessageResponse;

      it('runs the availability check once, when the item first completes', async () => {
        const areAnyAgentsOnline = jest.fn().mockResolvedValue(true);
        const serviceDesk = {
          getName: () => 'upsert-desk',
          startChat: jest.fn().mockResolvedValue(undefined),
          endChat: jest.fn().mockResolvedValue(undefined),
          sendMessageToAgent: jest.fn().mockResolvedValue(undefined),
          areAnyAgentsOnline,
        } as unknown as ServiceDesk;
        const { instance, store } = await renderChatAndGetInstanceWithStore({
          ...createBaseConfig(),
          serviceDeskFactory: () => Promise.resolve(serviceDesk),
          messaging: { ...createBaseConfig().messaging, skipWelcome: true },
        } as any);
        // The main window has to open so hydration initializes the desk.
        await instance.changeView(ViewType.MAIN_WINDOW);
        await waitFor(() => expect(store.getState().isHydrated).toBe(true));
        const loadingCounter = () =>
          store.getState().assistantMessageState.isMessageLoadingCounter;
        const baseline = loadingCounter();
        const id = 'upsert-connect';

        await instance.messaging.upsertMessage(id, MessageState.STREAMING, () =>
          connectMessage(id)
        );
        expect(areAnyAgentsOnline).not.toHaveBeenCalled();

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          connectMessage(id)
        );
        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          connectMessage(id, 'More')
        );

        expect(areAnyAgentsOnline).toHaveBeenCalledTimes(1);
        expect((areAnyAgentsOnline.mock.calls[0] as any[])[0].id).toBe(id);
        expect(
          store.getState().allMessagesByID[id].ui_state_internal
            .agent_availability
        ).toBe(HumanAgentsOnlineStatus.ONLINE);
        expect(loadingCounter()).toBe(baseline);
      });

      /**
       * Renders a chat with a service desk that reports agents online. The main window
       * has to open so hydration initializes the desk.
       */
      const renderWithOnlineDesk = async (extraConfig = {}) => {
        const areAnyAgentsOnline = jest.fn().mockResolvedValue(true);
        const serviceDesk = {
          getName: () => 'upsert-desk',
          startChat: jest.fn().mockResolvedValue(undefined),
          endChat: jest.fn().mockResolvedValue(undefined),
          sendMessageToAgent: jest.fn().mockResolvedValue(undefined),
          areAnyAgentsOnline,
        } as unknown as ServiceDesk;
        const rendered = await renderChatAndGetInstanceWithStore({
          ...createBaseConfig(),
          serviceDeskFactory: () => Promise.resolve(serviceDesk),
          messaging: { ...createBaseConfig().messaging, skipWelcome: true },
          ...extraConfig,
        } as any);
        await rendered.instance.changeView(ViewType.MAIN_WINDOW);
        await waitFor(() =>
          expect(rendered.store.getState().isHydrated).toBe(true)
        );
        return { ...rendered, areAnyAgentsOnline };
      };

      it('keeps the item handled when an edit rebuilds it', async () => {
        const { instance, areAnyAgentsOnline } = await renderWithOnlineDesk();
        const id = 'upsert-connect-edited';
        const withNote = (note: string) =>
          ({
            id,
            output: {
              generic: [{ ...connectToAgent, message_to_human_agent: note }],
            },
          }) as MessageResponse;

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          withNote('The user needs help')
        );
        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          withNote('The user needs help now')
        );

        expect(areAnyAgentsOnline).toHaveBeenCalledTimes(1);
      });

      it('starts the chat right away when the config skips the connect card and agents are online', async () => {
        const { instance } = await renderWithOnlineDesk({
          serviceDesk: { skipConnectHumanAgentCard: true },
        });
        const startChat = jest
          .spyOn(
            (instance as any).serviceManager.humanAgentService,
            'startChat'
          )
          .mockResolvedValue(undefined);
        const id = 'upsert-connect-skip-card';

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          connectMessage(id)
        );

        expect(startChat).toHaveBeenCalledTimes(1);
        const [localItem, message] = startChat.mock.calls[0] as any[];
        expect(localItem.fullMessageID).toBe(id);
        expect(message.id).toBe(id);
      });

      it('reports an integration error once when there is no service desk', async () => {
        const onError = jest.fn();
        const { instance, store } = await renderChatAndGetInstanceWithStore({
          ...createBaseConfig(),
          onError,
        });
        const loadingCounter = () =>
          store.getState().assistantMessageState.isMessageLoadingCounter;
        const baseline = loadingCounter();
        const id = 'upsert-connect-no-desk';

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          connectMessage(id, 'After the card')
        );
        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          connectMessage(id, 'After the card, edited')
        );

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0].errorType).toBe(
          OnErrorType.INTEGRATION_ERROR
        );
        expect(
          store.getState().allMessagesByID[id].ui_state_internal
            .agent_no_service_desk
        ).toBe(true);
        expect(loadingCounter()).toBe(baseline);
      });
    });

    describe('pause', () => {
      const text = (value: string) => ({
        response_type: MessageResponseTypes.TEXT,
        text: value,
      });
      const pause = (time: number, typing: boolean) => ({
        response_type: MessageResponseTypes.PAUSE,
        time,
        typing,
      });
      const visibleTexts = (store: any, id: string) => {
        const state = store.getState();
        return state.assistantMessageState.localMessageIDs
          .map((localID: string) => state.allMessageItemsByID[localID])
          .filter((item: any) => item?.fullMessageID === id)
          .map((item: any) => item.item.text);
      };

      it('reveals the items after a pause once it elapses, with the typing indicator during it', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const loadingCounter = () =>
          store.getState().assistantMessageState.isMessageLoadingCounter;
        const baseline = loadingCounter();
        const userDefined = jest.fn();
        const receive = jest.fn();
        instance.on([
          { type: BusEventType.USER_DEFINED_RESPONSE, handler: userDefined },
          { type: BusEventType.RECEIVE, handler: receive },
        ]);
        const id = 'upsert-pause';
        const message = () =>
          ({
            id,
            output: {
              generic: [text('First'), pause(500, true), text('Second')],
            },
          }) as MessageResponse;

        const startedAt = Date.now();
        const firstWrite = instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          message
        );
        await waitFor(() => expect(visibleTexts(store, id)).toEqual(['First']));
        expect(loadingCounter()).toBe(baseline + 1);

        await firstWrite;
        expect(Date.now() - startedAt).toBeGreaterThanOrEqual(450);
        expect(visibleTexts(store, id)).toEqual(['First', 'Second']);
        expect(loadingCounter()).toBe(baseline);
        expect(receive).toHaveBeenCalledTimes(1);
        // The pause is an instruction, not content: it never renders or fires an event.
        expect(userDefined).not.toHaveBeenCalled();

        // A later write of the same message does not pause again.
        const counts: number[] = [];
        const unsubscribe = store.subscribe(() =>
          counts.push(loadingCounter())
        );
        const secondStartedAt = Date.now();
        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () => ({
            ...message(),
            output: {
              generic: [text('First'), pause(500, true), text('Second!')],
            },
          })
        );
        unsubscribe();
        expect(Date.now() - secondStartedAt).toBeLessThan(400);
        expect(visibleTexts(store, id)).toEqual(['First', 'Second!']);
        expect(counts.every((count) => count === baseline)).toBe(true);
      });

      it('waits without the typing indicator for a pause without typing', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const loadingCounter = () =>
          store.getState().assistantMessageState.isMessageLoadingCounter;
        const baseline = loadingCounter();
        const id = 'upsert-pause-quiet';

        const write = instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () =>
            ({
              id,
              output: { generic: [pause(300, false), text('After')] },
            }) as MessageResponse
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(visibleTexts(store, id)).toEqual([]);
        expect(loadingCounter()).toBe(baseline);

        await write;
        expect(visibleTexts(store, id)).toEqual(['After']);
      });

      it('reveals the items after each of two pauses in turn', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const receive = jest.fn();
        instance.on({ type: BusEventType.RECEIVE, handler: receive });
        const id = 'upsert-two-pauses';

        const startedAt = Date.now();
        const write = instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () =>
            ({
              id,
              output: {
                generic: [
                  text('First'),
                  pause(300, false),
                  text('Second'),
                  pause(300, false),
                  text('Third'),
                ],
              },
            }) as MessageResponse
        );
        await waitFor(() => expect(visibleTexts(store, id)).toEqual(['First']));
        await waitFor(() =>
          expect(visibleTexts(store, id)).toEqual(['First', 'Second'])
        );
        expect(receive).not.toHaveBeenCalled();

        await write;
        expect(Date.now() - startedAt).toBeGreaterThanOrEqual(550);
        expect(visibleTexts(store, id)).toEqual(['First', 'Second', 'Third']);
        expect(receive).toHaveBeenCalledTimes(1);
      });

      it('reveals nothing more when the conversation restarts during a pause', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const loadingCounter = () =>
          store.getState().assistantMessageState.isMessageLoadingCounter;
        const baseline = loadingCounter();
        const receive = jest.fn();
        instance.on({ type: BusEventType.RECEIVE, handler: receive });
        const id = 'upsert-pause-restart';

        const write = instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () =>
            ({
              id,
              output: {
                generic: [text('First'), pause(300, true), text('Second')],
              },
            }) as MessageResponse
        );
        await waitFor(() => expect(visibleTexts(store, id)).toEqual(['First']));
        expect(loadingCounter()).toBe(baseline + 1);

        await instance.restartConversation();
        await write;

        expect(visibleTexts(store, id)).toEqual([]);
        expect(store.getState().allMessagesByID[id]).toBeUndefined();
        expect(receive).not.toHaveBeenCalled();
        expect(loadingCounter()).toBe(baseline);
      });

      it('stops revealing when a handler restarts the conversation during a reveal', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const loadingCounter = () =>
          store.getState().assistantMessageState.isMessageLoadingCounter;
        const baseline = loadingCounter();
        instance.on({
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: () => instance.restartConversation(),
        });
        const id = 'upsert-reveal-restart';

        await instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () =>
            ({
              id,
              output: {
                generic: [
                  pause(50, false),
                  {
                    response_type: MessageResponseTypes.USER_DEFINED,
                    user_defined: { kind: 'restarts' },
                  },
                  pause(300, true),
                  text('Never shown'),
                ],
              },
            }) as MessageResponse
        );

        // The second pause never starts, so its typing indicator never goes up.
        expect(loadingCounter()).toBe(baseline);
        expect(visibleTexts(store, id)).toEqual([]);
      });

      it('settles the items a stop leaves behind a pause', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'upsert-pause-stop';
        const itemsFor = () =>
          Object.values(
            store.getState().allMessageItemsByID as Record<string, any>
          ).filter((item) => item.fullMessageID === id);

        const write = instance.messaging.upsertMessage(
          id,
          MessageState.STREAMING,
          () =>
            ({
              id,
              output: {
                generic: [text('First'), pause(500, false), text('Second')],
              },
            }) as MessageResponse
        );
        await waitFor(() => expect(visibleTexts(store, id)).toEqual(['First']));

        await (
          instance as any
        ).serviceManager.messageService.cancelCurrentMessageRequest();
        await write;

        expect(visibleTexts(store, id)).toEqual(['First', 'Second']);
        expect(itemsFor()).toHaveLength(2);
        itemsFor().forEach((item) =>
          expect(item.ui_state.streamingState?.isDone).toBe(true)
        );
      });

      it('does not run the pauses of a message addMessage delivered again', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const loadingCounter = () =>
          store.getState().assistantMessageState.isMessageLoadingCounter;
        const baseline = loadingCounter();
        const id = 'add-then-upsert-pause';
        const message = (second: string) =>
          ({
            id,
            output: {
              generic: [text('First'), pause(300, true), text(second)],
            },
          }) as MessageResponse;

        await instance.messaging.addMessage(message('Second'));
        await waitFor(() =>
          expect(visibleTexts(store, id)).toEqual(['First', 'Second'])
        );
        expect(loadingCounter()).toBe(baseline);

        const counts: number[] = [];
        const unsubscribe = store.subscribe(() =>
          counts.push(loadingCounter())
        );
        const startedAt = Date.now();
        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          message('Second, edited')
        );
        unsubscribe();

        expect(Date.now() - startedAt).toBeLessThan(250);
        expect(visibleTexts(store, id)).toEqual(['First', 'Second, edited']);
        expect(counts.every((count) => count === baseline)).toBe(true);
      });
    });
  });
});
