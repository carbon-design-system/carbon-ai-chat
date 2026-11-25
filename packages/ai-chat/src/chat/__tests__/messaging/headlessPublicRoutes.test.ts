/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, cleanup } from '@testing-library/react';
import type { ServiceManager } from '../../../sdk/services/ServiceManager';

import { MessageState } from '../../../types/config/MessagingConfig';
import type { PublicConfig } from '../../../types/config/PublicConfig';
import {
  BusEventType,
  type BusEventReceive,
} from '../../../types/events/eventBusTypes';
import {
  MessageResponse,
  MessageResponseTypes,
  TextItem,
} from '../../../types/messaging/Messages';
import { resolvablePromise } from '../../../sdk/utils/resolvablePromise';
import { bootPrebuiltChat, mergePublicConfig } from '../../utils/chatBoot';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../helpers/chat';

beforeEach(setupBeforeEach);
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await setupAfterEach();
});

const text = (value: string): TextItem => ({
  response_type: MessageResponseTypes.TEXT,
  text: value,
});
const response = (
  id: string,
  values: string[],
  requestID?: string
): MessageResponse => ({
  id,
  request_id: requestID,
  output: { generic: values.map(text) },
});

async function viewlessChat(config: PublicConfig) {
  const { instance, serviceManager } = await bootPrebuiltChat({
    publicConfig: mergePublicConfig(config),
  });
  return { instance, serviceManager, store: serviceManager.store };
}

async function bootMode(
  withAdapter: boolean,
  customSendMessage: NonNullable<
    PublicConfig['messaging']
  >['customSendMessage'] = async () => undefined,
  normalizeCancellationIDs = false
) {
  const config = {
    ...createBaseConfig(),
    messaging: { skipWelcome: true, messageTimeoutSecs: 0, customSendMessage },
  };
  // With no adapter, the chat boots through `createChatSDK` and never gets a
  // view; otherwise it's a mounted chat.
  const boot = withAdapter
    ? await renderChatAndGetInstanceWithStore(config)
    : await viewlessChat(config);
  const manager = (boot.serviceManager.messageCoordinator as any)
    .serviceManager as ServiceManager;
  const trace: string[] = [];
  const cancellationIDs = new Map<string, string>();
  const traceResponseID = (message: MessageResponse) => {
    const items = message.output.generic;
    if (
      normalizeCancellationIDs &&
      items.length === 1 &&
      items[0].response_type === MessageResponseTypes.SYSTEM &&
      'title' in items[0] &&
      items[0].title ===
        boot.store.getState().languagePack.messages_requestCancelled
    ) {
      if (!cancellationIDs.has(message.id)) {
        cancellationIDs.set(
          message.id,
          `cancellation-${cancellationIDs.size + 1}`
        );
      }
      return cancellationIDs.get(message.id);
    }
    return message.id;
  };
  const record = (label: string) => {
    const state = boot.instance.state.get();
    const messages = state.messages.map((message) =>
      'input' in message
        ? { request: 'text' in message.input ? message.input.text : 'event' }
        : {
            response: traceResponseID(message),
            items: message.output.generic.map((item) =>
              'text' in item
                ? item.text
                : item.response_type === MessageResponseTypes.SYSTEM &&
                    'title' in item
                  ? { type: item.response_type, title: item.title }
                  : item.response_type
            ),
          }
    );
    trace.push(`${label}:${state.status}:${JSON.stringify(messages)}`);
  };
  const visible = (id: string) =>
    boot.store
      .getState()
      .assistantMessageState.localMessageIDs.map(
        (localID) => boot.store.getState().allMessageItemsByID[localID]
      )
      .filter((local) => local.fullMessageID === id)
      .map((local) => (local.item as TextItem).text);
  return {
    ...boot,
    manager,
    trace,
    record,
    visible,
    cancellationIDs,
    dispose: () => {
      if (withAdapter) {
        manager.messageCoordinator.disposeReasoningObserver();
        cleanup();
      } else {
        void manager.shutdown();
      }
    },
  };
}

it('matches public send/chunk/final traces while separating queue release from late transport settlement', async () => {
  async function run(withAdapter: boolean) {
    const firstHost = resolvablePromise<void>();
    const secondHost = resolvablePromise<void>();
    const firstEntered = resolvablePromise<string>();
    const secondEntered = resolvablePromise<void>();
    const receiveEntered = resolvablePromise<void>();
    const finishReceive = resolvablePromise<void>();
    let secondStarted = false;
    const chat = await bootMode(withAdapter, (request) => {
      if (request.input.text === 'first') {
        firstEntered.doResolve(request.id);
        return firstHost;
      }
      secondStarted = true;
      secondEntered.doResolve();
      return secondHost;
    });
    let firstSettled = false;
    let finalSettled = false;
    chat.instance.on({
      type: BusEventType.RECEIVE,
      handler: (event: BusEventReceive) => {
        if (event.data.id === 'stream') {
          chat.record('receive-enter');
          receiveEntered.doResolve();
          return finishReceive;
        }
        return undefined;
      },
    });
    try {
      const first = chat.instance.send('first').then(() => {
        firstSettled = true;
        chat.record('first-settled');
      });
      const requestID = await firstEntered;
      chat.record('first-transport');
      const second = chat.instance
        .send('second')
        .then(() => chat.record('second-settled'));
      await chat.instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'stream', request_id: requestID },
        partial_item: {
          ...text('partial'),
          streaming_metadata: { id: 'item', cancellable: true },
        },
      });
      chat.record('partial-written');
      expect(chat.instance.state.get().status).toBe('streaming');
      const finalResponse = response('stream', ['final'], requestID);
      finalResponse.output.generic[0].streaming_metadata = { id: 'item' };
      const final = chat.instance.messaging
        .addMessageChunk({ final_response: finalResponse })
        .then(() => {
          finalSettled = true;
          chat.record('final-settled');
        });
      await receiveEntered;
      expect(finalSettled).toBe(false);
      expect(firstSettled).toBe(false);
      expect(secondStarted).toBe(false);
      chat.record('receive-blocked');
      finishReceive.doResolve();
      await final;
      await secondEntered;
      expect(firstSettled).toBe(false);
      expect(secondStarted).toBe(true);
      chat.record('second-transport-before-first-settled');
      firstHost.doResolve();
      await first;
      secondHost.doResolve();
      await second;
      expect(chat.instance.state.get().status).toBe('ready');
      expect(
        chat.trace.findIndex((entry) => entry.startsWith('final-settled:'))
      ).toBeLessThan(
        chat.trace.findIndex((entry) => entry.startsWith('first-settled:'))
      );
      return chat.trace;
    } finally {
      finishReceive.doResolve();
      firstHost.doResolve();
      secondHost.doResolve();
      chat.dispose();
    }
  }
  expect(await run(false)).toEqual(await run(true));
});

it('matches full-response overlap and blocks a removed detached reveal after recreation', async () => {
  async function run(withAdapter: boolean) {
    const chat = await bootMode(withAdapter);
    vi.useFakeTimers();
    const core = chat.manager.messageCoordinator;
    const originalPause = core.waitForPause.bind(core);
    let entered = resolvablePromise<void>();
    const pause = vi
      .spyOn(core, 'waitForPause')
      .mockImplementation((...args) => {
        entered.doResolve();
        return originalPause(...args);
      });
    chat.instance.on({
      type: BusEventType.RECEIVE,
      handler: (event: BusEventReceive) => {
        chat.record(`receive-${event.data.id}`);
      },
    });
    const paused = (id: string): MessageResponse => ({
      id,
      output: {
        generic: [
          text('first'),
          { response_type: MessageResponseTypes.PAUSE, time: 50 },
          text('late'),
        ],
      },
    });
    try {
      await chat.instance.messaging.addMessage(paused('overlap'));
      chat.record('first-receive-settled');
      await entered;
      await chat.instance.messaging.addMessage(
        response('overlap', ['replacement'])
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(chat.visible('overlap')).toEqual(['replacement']);
      chat.record('replacement-before-reveal');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(chat.visible('overlap')).toEqual(['replacement', 'late']);
      chat.record('old-reveal-completed');
      entered = resolvablePromise<void>();
      await chat.instance.messaging.addMessage(paused('removed'));
      await entered;
      await chat.instance.messaging.removeMessages(['removed']);
      await chat.instance.messaging.addMessage(response('removed', ['fresh']));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(chat.visible('removed')).toEqual(['fresh']);
      expect(core.incomingWriteLifetime.state.pendingWrites.size).toBe(0);
      chat.record('removed-reveal-suppressed');
      return chat.trace;
    } finally {
      pause.mockRestore();
      chat.dispose();
      vi.useRealTimers();
    }
  }
  expect(await run(false)).toEqual(await run(true));
});

it.each<'native-slot' | 'native-receive' | 'legacy-receive'>([
  'native-receive',
])('matches public callback rejection and settlement for %s', async (route) => {
  async function run(withAdapter: boolean) {
    const chat = await bootMode(withAdapter);
    const entered = resolvablePromise<void>();
    const callback = resolvablePromise<void>();
    const failure = new Error('paired host failure');
    const logged = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const message = response('rejected', ['content']);
    if (route === 'native-slot') {
      message.output.generic = [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: {},
        },
      ];
    }
    chat.instance.on({
      type:
        route === 'native-slot'
          ? BusEventType.USER_DEFINED_RESPONSE
          : BusEventType.RECEIVE,
      handler: () => {
        chat.record('callback-enter');
        entered.doResolve();
        return callback;
      },
    });
    let outcome: unknown = 'pending';
    const work = (
      route === 'legacy-receive'
        ? chat.instance.messaging.addMessage(message)
        : chat.instance.messaging.upsertMessage(
            message.id,
            MessageState.COMPLETE,
            () => message
          )
    ).then(
      () => {
        outcome = 'resolved';
        chat.record('public-resolved');
      },
      (error) => {
        outcome = error;
        chat.record('public-rejected');
      }
    );
    try {
      await entered;
      expect(outcome).toBe('pending');
      chat.record('callback-blocked');
      callback.doReject(failure);
      await work;
      if (route === 'native-receive') {
        expect(outcome).toBe('resolved');
        expect(logged.mock.calls.some((args) => args.includes(failure))).toBe(
          true
        );
      } else {
        expect(outcome).toBe(failure);
      }
      expect(chat.trace[0]).toMatch(/^callback-enter:/);
      expect(chat.trace[1]).toMatch(/^callback-blocked:/);
      expect(chat.trace[2]).toMatch(
        route === 'native-receive' ? /^public-resolved:/ : /^public-rejected:/
      );
      return chat.trace;
    } finally {
      callback.doResolve();
      await work;
      logged.mockRestore();
      chat.dispose();
    }
  }
  expect(await run(false)).toEqual(await run(true));
});
