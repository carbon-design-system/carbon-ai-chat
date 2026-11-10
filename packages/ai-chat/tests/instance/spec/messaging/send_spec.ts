/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `instance.messaging.send` and the deprecated root `instance.send` are one verb (#1826 O1–O3).
 * The parity case runs one queued scenario through each entry and compares what a host can see:
 * events, `customSendMessage` calls, public state, and when each promise settles.
 */

import { waitFor } from '@testing-library/react';
import { createChatSDK } from '../../../../src/sdk';
import { resolvablePromise } from '../../../../src/shared/utils/resolvablePromise';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import type { PublicConfig } from '../../../../src/types/config/PublicConfig';
import {
  BusEventType,
  MessageSendSource,
  type BusEvent,
  type BusEventSend,
} from '../../../../src/types/events/eventBusTypes';
import type { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import { ViewType } from '../../../../src/types/instance/apiTypes';
import type { ChatSDKInstance } from '../../../../src/types/instance/ChatSDKInstance';
import {
  MessageResponseTypes,
  type MessageRequest,
} from '../../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstance,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

type Entry = 'root' | 'messaging';

const send = (
  instance: ChatInstance,
  entry: Entry,
  ...args: Parameters<ChatInstance['send']>
) =>
  entry === 'root' ? instance.send(...args) : instance.messaging.send(...args);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Copies `value` with each generated ID replaced by its order of first use, and each clock
 * reading replaced by a marker, so two runs compare equal when they did the same thing.
 */
function normalizer() {
  const ids = new Map<string, string>();
  const normalize = (value: unknown, key?: string): unknown => {
    if (key === 'timestamp' || key === 'time') {
      return '<time>';
    }
    if (typeof value === 'string' && UUID.test(value)) {
      if (!ids.has(value)) {
        ids.set(value, `id-${ids.size}`);
      }
      return ids.get(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => normalize(item));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([field, item]) => [
          field,
          normalize(item, field),
        ])
      );
    }
    return typeof value === 'function' ? '<function>' : value;
  };
  return normalize;
}

/** Replies to each request with one complete text message, holding the first until `release`. */
function hostReplies(release: Promise<void>) {
  const calls: { request: MessageRequest; silent: boolean }[] = [];
  const customSendMessage = async (
    request: MessageRequest,
    options: { silent: boolean },
    instance: ChatSDKInstance
  ) => {
    calls.push({ request, silent: options.silent });
    if (calls.length === 1) {
      await release;
    }
    const replyID = `reply-${calls.length}`;
    await instance.messaging.upsertMessage(
      replyID,
      MessageState.COMPLETE,
      () => ({
        id: replyID,
        request_id: request.id,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: `Reply ${calls.length}`,
            },
          ],
        },
      })
    );
  };
  return { calls, customSendMessage };
}

async function runQueuedScenario(entry: Entry, hydrated: boolean) {
  // Each run starts as a first visit, without the session the run before saved.
  sessionStorage.clear();
  localStorage.clear();
  const release = resolvablePromise<void>();
  const host = hostReplies(release);
  const config: PublicConfig = {
    ...createBaseConfig(),
    messaging: {
      skipWelcome: true,
      customSendMessage: host.customSendMessage,
    },
  };
  const instance = await renderChatAndGetInstance(config);
  if (hydrated) {
    await instance.changeView(ViewType.MAIN_WINDOW);
    await waitFor(() => expect(instance.state.get().status).toBe('ready'));
  }
  const normalize = normalizer();
  const events: unknown[] = [];
  const record = (event: BusEvent & { data?: any; source?: unknown }) => {
    events.push(
      normalize({
        type: event.type,
        source: event.source,
        id: event.data?.id,
        requestID: event.data?.request_id,
        text: event.data?.input?.text,
      })
    );
  };
  instance.on(
    Object.values(BusEventType).map((type) => ({ type, handler: record }))
  );

  const settled: string[] = [];
  const track = (name: string, promise: Promise<void>) =>
    promise.then(
      () => settled.push(`${name} resolved`),
      (error) => settled.push(`${name} rejected: ${error}`)
    );
  const sends = Promise.all([
    track('text', send(instance, entry, 'First')),
    track(
      'request',
      send(instance, entry, { id: 'second', input: { text: 'Second' } })
    ),
    track('silent', send(instance, entry, 'Quiet', { silent: true })),
  ]);

  await waitFor(() => expect(host.calls).toHaveLength(1));
  const whileHeld = normalize(instance.state.get());
  release.doResolve();
  await sends;

  return {
    events,
    calls: normalize(host.calls) as typeof host.calls,
    whileHeld,
    after: normalize(instance.state.get()),
    settled,
  };
}

describe('messaging.send (#1826)', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  // Before hydration, the first send starts it, and sends made while it loads go out first.
  // That's today's behavior, and the parity holds there too.
  it.each([
    ['after', true],
    ['before', false],
  ])(
    'has the same events, queue, state, and settlement as the root send %s hydration (O1, O2)',
    async (_when, hydrated) => {
      const root = await runQueuedScenario('root', hydrated);
      setupAfterEach();
      const messaging = await runQueuedScenario('messaging', hydrated);

      expect(messaging).toEqual(root);

      // The scenario did what it set out to: three turns, each sent from code.
      const sent = root.calls.map(({ request, silent }) => [
        request.input.text,
        Boolean(silent),
      ]);
      expect(sent).toEqual(
        expect.arrayContaining([
          ['First', false],
          ['Second', false],
          ['Quiet', true],
        ])
      );
      expect(root.settled).toHaveLength(3);
      expect(root.settled.every((line) => line.endsWith('resolved'))).toBe(
        true
      );
      const sendEvents = root.events.filter(
        (event: { type: string }) => event.type === BusEventType.SEND
      );
      expect(sendEvents).toHaveLength(3);
      sendEvents.forEach((event) =>
        expect(event).toMatchObject({ source: MessageSendSource.INSTANCE_SEND })
      );
      expect(
        root.events.filter(
          (event: { type: string }) => event.type === BusEventType.RECEIVE
        )
      ).toHaveLength(3);
      expect(root.whileHeld).toMatchObject({ status: 'submitted' });
      expect(root.after).toMatchObject({ status: 'ready', error: null });
      if (hydrated) {
        // Queued in the order sent.
        expect(sent.map(([text]) => text)).toEqual([
          'First',
          'Second',
          'Quiet',
        ]);
        expect(root.settled).toEqual([
          'text resolved',
          'request resolved',
          'silent resolved',
        ]);
      }
    }
  );

  it.each<Entry>(['root', 'messaging'])(
    'the %s entry rejects in read-only mode instead of throwing (O3)',
    async (entry) => {
      const customSendMessage = jest.fn();
      const instance = await renderChatAndGetInstance({
        ...createBaseConfig(),
        isReadonly: true,
        messaging: { skipWelcome: true, customSendMessage },
      });
      const preSend = jest.fn();
      instance.on({ type: BusEventType.PRE_SEND, handler: preSend });

      let sending: Promise<void>;
      expect(() => {
        sending = send(instance, entry, 'Hello');
      }).not.toThrow();
      await expect(sending).rejects.toThrow(
        'You are unable to send messages in read only mode.'
      );
      expect(preSend).not.toHaveBeenCalled();
      expect(customSendMessage).not.toHaveBeenCalled();
    }
  );

  describe('on a chat with no view', () => {
    it('sends from code and resolves once the turn is processed', async () => {
      const release = resolvablePromise<void>();
      release.doResolve();
      const host = hostReplies(release);
      const chat = await createChatSDK({
        messaging: {
          skipWelcome: true,
          customSendMessage: host.customSendMessage,
        },
      });
      const sources: unknown[] = [];
      chat.on({
        type: BusEventType.SEND,
        handler: (event: BusEventSend) => sources.push(event.source),
      });

      await chat.messaging.send('Hello');

      expect(sources).toEqual([MessageSendSource.INSTANCE_SEND]);
      expect(host.calls).toHaveLength(1);
      expect(chat.state.get().status).toBe('ready');
      expect(chat.state.get().messages.map((message) => message.id)).toEqual([
        host.calls[0].request.id,
        'reply-1',
      ]);
      chat.destroy();
    });

    it('rejects while isReadonly is set', async () => {
      const customSendMessage = jest.fn();
      const chat = await createChatSDK({
        isReadonly: true,
        messaging: { skipWelcome: true, customSendMessage },
      });

      await expect(chat.messaging.send('Hello')).rejects.toThrow(
        'You are unable to send messages in read only mode.'
      );
      expect(customSendMessage).not.toHaveBeenCalled();
      chat.destroy();
    });
  });
});
