/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { HumanAgentsOnlineStatus } from '../../../../src/types/config/ServiceDeskConfig';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  GenericItem,
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import {
  BusEventType,
  BusEventUserDefinedResponse,
} from '../../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

const item = (value: string) => ({
  response_type: MessageResponseTypes.USER_DEFINED,
  user_defined: { value },
});
const response = (values: string[]): MessageResponse => ({
  id: 'reasoning-origin',
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'Answer',
        streaming_metadata: { id: 'answer' },
      },
    ],
  },
  message_options: { reasoning: { content: values.map(item) } },
});

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it('keeps new reasoning from a same-ID history merge on the legacy mutation path', async () => {
  const { instance } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const message = response(['native']);
  const observations: boolean[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      if (event.data.message.user_defined.value === 'legacy appended') {
        observations.push(Object.isFrozen(event.data.fullMessage));
        event.data.message.user_defined.value = 'legacy edit';
        expect(event.data.message.user_defined.value).toBe('legacy edit');
      }
    },
  });
  await act(async () => {
    await instance.messaging.upsertMessage(
      message.id,
      MessageState.COMPLETE,
      () => message
    );
  });
  await act(async () => {
    await instance.messaging.insertHistory([
      {
        message: response(['old first item', 'legacy appended']),
        time: '2026-11-02T12:00:00.000Z',
      },
    ]);
  });
  await waitFor(() => expect(observations.length).toBeGreaterThan(0));
  expect(observations.every((frozen) => !frozen)).toBe(true);
  expect(
    (message.message_options.reasoning.content as GenericItem[])[0].user_defined
      .value
  ).toBe('native');
});

it('keeps native and legacy reasoning writable without refiring existing items', async () => {
  const { instance, store } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const seen: unknown[] = [];
  let retainedNativeEvent: BusEventUserDefinedResponse;
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      const value = event.data.message.user_defined.value;
      seen.push(value);
      if (value === 'legacy') {
        expect(Object.isFrozen(event.data.message)).toBe(false);
        event.data.message.user_defined.value = 'legacy edit';
      } else {
        retainedNativeEvent = event;
        expect(Object.isFrozen(event.data.message)).toBe(false);
        expect(Object.isFrozen(event.data.fullMessage)).toBe(false);
        expect(event.data.fullMessage).not.toBe(
          store.getState().allMessagesByID['reasoning-origin']
        );
        event.data.message.user_defined.edited = true;
        expect(event.data.message.user_defined.edited).toBe(true);
      }
    },
  });
  const first = response(['native']);
  await act(async () => {
    await instance.messaging.upsertMessage(
      first.id,
      MessageState.STREAMING,
      () => first
    );
  });
  await waitFor(() => expect(seen).toEqual(['native']));
  await waitFor(() =>
    expect(store.getState().allMessagesByID[first.id]).toMatchObject({
      message_options: {
        reasoning: { content: [{ user_defined: { edited: true } }] },
      },
    })
  );
  const firstSnapshot = instance.getState();
  expect(
    (first.message_options.reasoning.content as GenericItem[])[0].user_defined
      .edited
  ).toBeUndefined();
  expect(
    store.getState().allMessageItemsByID[`${first.id}-reasoning-intro-item-0`]
  ).toBeUndefined();
  retainedNativeEvent.data.message.user_defined.edited = false;
  retainedNativeEvent.data.fullMessage.context = { late: true };
  expect(store.getState().allMessagesByID[first.id]).toMatchObject({
    message_options: {
      reasoning: { content: [{ user_defined: { edited: true } }] },
    },
  });
  expect(store.getState().allMessagesByID[first.id].context).toBeUndefined();
  expect(instance.getState()).toEqual(firstSnapshot);
  await act(async () => {
    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: first.id },
      partial_item: {
        response_type: MessageResponseTypes.TEXT,
        text: ' continues',
        streaming_metadata: { id: 'answer' },
      },
      partial_response: {
        message_options: {
          reasoning: { content: [item('native'), item('legacy')] },
        },
      },
    });
  });
  await waitFor(() => expect(seen).toEqual(['native', 'legacy']));
  await act(async () => {
    await instance.messaging.upsertMessage(
      first.id,
      MessageState.COMPLETE,
      () => response(['native', 'legacy edit', 'native again'])
    );
  });
  await waitFor(() =>
    expect(seen).toEqual(['native', 'legacy', 'native again'])
  );
  expect(
    (first.message_options.reasoning.content as GenericItem[])[0].user_defined
      .value
  ).toBe('native');
  expect(Object.isFrozen(first.message_options.reasoning.content[0])).toBe(
    false
  );
});

it.each(['pause', 'handoff'])(
  'copies native reasoning content through %s',
  async (copyKind) => {
    const config = createBaseConfig();
    config.serviceDesk = { skipConnectHumanAgentCard: true };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const handoff = jest
      .spyOn(serviceManager.humanAgentService, 'handleConnectToHumanAgent')
      .mockImplementation(async (_localItem, fullMessage) => {
        expect(Object.isFrozen(fullMessage)).toBe(false);
        fullMessage.ui_state_internal.agent_availability =
          HumanAgentsOnlineStatus.OFFLINE;
      });
    const wait = jest
      .spyOn(serviceManager.chunkProcessingService, 'waitForPause')
      .mockResolvedValue(undefined);
    const message = response(['native']);
    message.output.generic.unshift(
      copyKind === 'pause'
        ? { response_type: MessageResponseTypes.PAUSE, time: 1 }
        : { response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT }
    );
    const outputs = new Set<object>();
    const release = store.subscribe(() => {
      const current = store.getState().allMessagesByID[
        message.id
      ] as MessageResponse;
      const content = current?.message_options?.reasoning?.content;
      if (Array.isArray(content) && content[0]) {
        outputs.add(current.output);
      }
    });
    try {
      await act(async () => {
        await instance.messaging.upsertMessage(
          message.id,
          MessageState.COMPLETE,
          () => message
        );
      });
      expect(outputs.size).toBeGreaterThanOrEqual(2);
      if (copyKind === 'pause') {
        expect(wait).toHaveBeenCalledTimes(1);
      } else {
        expect(handoff).toHaveBeenCalledTimes(1);
        expect(
          store.getState().allMessagesByID[message.id].ui_state_internal
            .agent_availability
        ).toBe(HumanAgentsOnlineStatus.OFFLINE);
      }
    } finally {
      release();
      handoff.mockRestore();
      wait.mockRestore();
    }
  }
);

it.each(['addMessage', 'history'])(
  'fires one %s reasoning event after the native message is removed',
  async (route) => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await instance.messaging.upsertMessage(
        'reasoning-origin',
        MessageState.COMPLETE,
        () => response(['native'])
      );
    });
    await act(async () => {
      await instance.messaging.removeMessages(['reasoning-origin']);
    });
    const events: BusEventUserDefinedResponse[] = [];
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: BusEventUserDefinedResponse) => {
        events.push(event);
      },
    });
    await act(async () => {
      if (route === 'history') {
        await instance.messaging.insertHistory([
          { message: response(['legacy']), time: '2026-11-02T12:00:00.000Z' },
        ]);
      } else {
        await instance.messaging.addMessage(response(['legacy']));
      }
    });
    await waitFor(() => expect(events).toHaveLength(1));
    expect(Object.isFrozen(events[0].data.message)).toBe(
      route === 'addMessage'
    );
  }
);
