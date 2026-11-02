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
import { prepareReasoningMessageEvent } from '../../../../src/chat/services/messaging/nativeMessageEvents';
import { synthesizeReasoningLocalMessageItem } from '../../../../src/chat/utils/reasoningContent';
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

it('keeps native reasoning frozen and legacy chunk reasoning mutable without refiring existing items', async () => {
  const { instance, store } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const seen: unknown[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      const value = event.data.message.user_defined.value;
      seen.push(value);
      if (value === 'legacy') {
        expect(Object.isFrozen(event.data.message)).toBe(false);
        event.data.message.user_defined.value = 'legacy edit';
      } else {
        expect(event.data.message).toBe(
          (event.data.fullMessage as MessageResponse).message_options.reasoning
            .content[seen.length - 1]
        );
        expect(Object.isFrozen(event.data.fullMessage)).toBe(true);
        expect(event.data.fullMessage).not.toBe(
          store.getState().allMessagesByID['reasoning-origin']
        );
        expect(() => {
          event.data.message.user_defined.value = 'bad edit';
        }).toThrow(TypeError);
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

it('tags native content before a synchronous store subscriber can prepare a reasoning event', async () => {
  const { instance, store } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const observations: boolean[] = [];
  const release = store.subscribe(() => {
    const message = store.getState().allMessagesByID[
      'reasoning-origin'
    ] as MessageResponse;
    const content = message?.message_options?.reasoning?.content;
    if (Array.isArray(content) && content[0]) {
      const local = synthesizeReasoningLocalMessageItem(
        content[0],
        message.id,
        'sync-reasoning'
      );
      observations.push(
        Object.isFrozen(prepareReasoningMessageEvent(message, local).message)
      );
    }
  });
  try {
    await act(async () => {
      await instance.messaging.upsertMessage(
        'reasoning-origin',
        MessageState.COMPLETE,
        () => response(['native'])
      );
    });
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every(Boolean)).toBe(true);
  } finally {
    release();
  }
});

it.each(['pause', 'handoff'])(
  'retains native reasoning provenance through %s copies',
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
    const observed: boolean[] = [];
    const release = store.subscribe(() => {
      const current = store.getState().allMessagesByID[
        message.id
      ] as MessageResponse;
      const content = current?.message_options?.reasoning?.content;
      if (Array.isArray(content) && content[0]) {
        outputs.add(current.output);
        const local = synthesizeReasoningLocalMessageItem(
          content[0],
          current.id,
          'copied-reasoning'
        );
        observed.push(
          Object.isFrozen(prepareReasoningMessageEvent(current, local).message)
        );
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
      expect(observed.every(Boolean)).toBe(true);
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
  'does not carry native provenance into %s after removal',
  async (route) => {
    const { instance, store } =
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
    const current = store.getState().allMessagesByID[
      'reasoning-origin'
    ] as MessageResponse;
    const local = synthesizeReasoningLocalMessageItem(
      (current.message_options.reasoning.content as GenericItem[])[0],
      current.id,
      'legacy-reasoning'
    );
    expect(prepareReasoningMessageEvent(current, local).message).toBe(current);
  }
);
