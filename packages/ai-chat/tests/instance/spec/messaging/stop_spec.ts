/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `instance.messaging.stop()` (#1816). It fires `stopStreaming`, then aborts the active turn, and
 * settles it at once, as the built-in Stop button always has (O9–O12 amended November 10).
 */

import { waitFor } from '@testing-library/react';
import { requestStopFromInput } from '../../../../src/chat/services/assistantInputCommands';
import createHumanAgentService from '../../../../src/sdk/services/haa/HumanAgentServiceImpl';
import actions from '../../../../src/sdk/store/actions';
import type { ServiceDesk } from '../../../../src/types/config/ServiceDeskConfig';
import { resolvablePromise } from '../../../../src/sdk/utils/resolvablePromise';
import {
  CancellationReason,
  MessageState,
} from '../../../../src/types/config/MessagingConfig';
import type { PublicConfig } from '../../../../src/types/config/PublicConfig';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import type { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import { ViewType } from '../../../../src/types/instance/apiTypes';
import {
  MessageResponseTypes,
  type MessageRequest,
  type MessageResponse,
} from '../../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstance,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

type Stream = 'chunk' | 'upsert';

interface Turn {
  request: MessageRequest;
  signal: AbortSignal;
}

/**
 * A host that streams one partial item per request, then waits for `finish` without ever
 * looking at the abort signal, so a stop can't lean on the host returning.
 */
function streamingHost(
  stream: Stream,
  { cancellable, silent }: { cancellable?: boolean; silent?: boolean } = {}
) {
  const turns: Turn[] = [];
  const log: string[] = [];
  /** Ends every turn. */
  const finish = resolvablePromise<void>();
  /** One per turn, to end a single turn. */
  const holds: ReturnType<typeof resolvablePromise<void>>[] = [];
  const customSendMessage = async (
    request: MessageRequest,
    { signal }: { signal: AbortSignal },
    instance: ChatInstance
  ) => {
    turns.push({ request, signal });
    const hold = resolvablePromise<void>();
    holds.push(hold);
    signal.addEventListener('abort', () => log.push(`abort ${signal.reason}`));
    const responseID = `response-${turns.length}`;
    if (!silent) {
      await writePartial(instance, stream, request, responseID, 'Partial', {
        cancellable,
      });
    }
    await Promise.race([finish, hold]);
  };
  return { turns, log, finish, holds, customSendMessage };
}

async function writePartial(
  instance: ChatInstance,
  stream: Stream,
  request: MessageRequest,
  responseID: string,
  text: string,
  { cancellable }: { cancellable?: boolean } = {}
) {
  if (stream === 'chunk') {
    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: responseID },
      partial_item: {
        response_type: MessageResponseTypes.TEXT,
        text,
        streaming_metadata: { id: 'item-1', cancellable },
      },
    });
    return;
  }
  await instance.messaging.upsertMessage(
    responseID,
    MessageState.STREAMING,
    (): MessageResponse => ({
      id: responseID,
      request_id: request.id,
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text }],
      },
    })
  );
}

async function chatWith(
  host: ReturnType<typeof streamingHost>,
  { showStopButtonImmediately = true } = {}
) {
  const config: PublicConfig = {
    ...createBaseConfig(),
    messaging: {
      skipWelcome: true,
      showStopButtonImmediately,
      customSendMessage: host.customSendMessage,
    },
  };
  const instance = await renderChatAndGetInstance(config);
  // Open the window first, so sends queue in the order made (06b's DEFERRED note).
  await instance.changeView(ViewType.MAIN_WINDOW);
  await waitFor(() => expect(instance.state.get().status).toBe('ready'));
  instance.on({
    type: BusEventType.STOP_STREAMING,
    handler: () => {
      host.log.push('stopStreaming');
    },
  });
  return instance;
}

function textOf(instance: ChatInstance, responseID: string) {
  const message = instance.state
    .get()
    .messages.find((item) => item.id === responseID) as MessageResponse;
  return message?.output.generic.map((item) => 'text' in item && item.text);
}

describe('messaging.stop (#1816)', () => {
  beforeEach(() => {
    setupBeforeEach();
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(setupAfterEach);

  it.each<Stream>(['chunk', 'upsert'])(
    'fires stopStreaming, then aborts a %s stream, and resolves without waiting for the host (O1–O3, O6)',
    async (stream) => {
      const host = streamingHost(stream);
      const instance = await chatWith(host);
      let sendSettled = '';
      const sending = instance.messaging.send('Hello').then(
        () => (sendSettled = 'resolved'),
        () => (sendSettled = 'rejected')
      );
      await waitFor(() =>
        expect(instance.state.get().status).toBe('streaming')
      );

      await instance.messaging.stop();

      expect(host.log).toEqual([
        'stopStreaming',
        `abort ${CancellationReason.STOP_STREAMING}`,
      ]);
      // customSendMessage is still awaiting `finish`.
      await sending;
      expect(sendSettled).toBe('resolved');
      host.finish.doResolve();
    }
  );

  it.each<Stream>(['chunk', 'upsert'])(
    'settles a stopped %s stream at once: ready, content kept, the turn not revived (O9–O12 amended)',
    async (stream) => {
      const host = streamingHost(stream);
      const instance = await chatWith(host);
      const sending = instance.messaging.send('Hello');
      await waitFor(() =>
        expect(instance.state.get().status).toBe('streaming')
      );

      await instance.messaging.stop();
      await sending;

      expect(instance.state.get().status).toBe('ready');
      expect(textOf(instance, 'response-1')).toEqual(['Partial']);

      // The host writes again after the abort; the stopped turn ignores it.
      await writePartial(
        instance,
        stream,
        host.turns[0].request,
        'response-1',
        'Partial and more'
      ).catch((): void => undefined);
      // A late chunk is dropped. A late upsert is the host's own write, so it lands.
      expect(textOf(instance, 'response-1')).toEqual(
        stream === 'chunk' ? ['Partial'] : ['Partial and more']
      );
      expect(instance.state.get().status).toBe('ready');
      host.finish.doResolve();
    }
  );

  it('resolves at once with no active turn, firing nothing and changing nothing (O4, O5)', async () => {
    const host = streamingHost('chunk');
    const instance = await chatWith(host);
    const before = instance.state.get();

    await expect(instance.messaging.stop()).resolves.toBeUndefined();

    expect(host.log).toEqual([]);
    expect(instance.state.get()).toBe(before);
  });

  it('never rejects, and still stops the turn, when a stopStreaming handler throws (O5)', async () => {
    const host = streamingHost('chunk');
    const instance = await chatWith(host);
    instance.on({
      type: BusEventType.STOP_STREAMING,
      handler: () => {
        throw new Error('handler failed');
      },
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const sending = instance.messaging.send('Hello');
    await waitFor(() => expect(instance.state.get().status).toBe('streaming'));

    await expect(instance.messaging.stop()).resolves.toBeUndefined();
    await sending;

    expect(host.turns[0].signal.aborted).toBe(true);
    expect(instance.state.get().status).toBe('ready');
    host.finish.doResolve();
  });

  it("keeps the button's recovery when a stopStreaming handler throws", async () => {
    const host = streamingHost('chunk');
    const instance = await chatWith(host);
    instance.on({
      type: BusEventType.STOP_STREAMING,
      handler: () => {
        throw new Error('handler failed');
      },
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    void instance.messaging.send('Hello');
    await waitFor(() => expect(instance.state.get().status).toBe('streaming'));

    await requestStopFromInput(instance.serviceManager, () => undefined);

    // As before: the turn keeps running and the button can be pressed again.
    expect(host.turns[0].signal.aborted).toBe(false);
    expect(
      instance.serviceManager.store.getState().assistantInputState
        .stopStreamingButtonState.isDisabled
    ).toBe(false);
    host.finish.doResolve();
  });

  it('stops a submitted turn with no stream and no visible button', async () => {
    const host = streamingHost('chunk', { silent: true });
    const instance = await chatWith(host, { showStopButtonImmediately: false });
    const sending = instance.messaging.send('Hello');
    await waitFor(() => expect(instance.state.get().status).toBe('submitted'));
    expect(
      instance.serviceManager.store.getState().assistantInputState
        .stopStreamingButtonState.isVisible
    ).toBe(false);

    await instance.messaging.stop();
    await sending;

    expect(host.log).toEqual([
      'stopStreaming',
      `abort ${CancellationReason.STOP_STREAMING}`,
    ]);
    expect(instance.state.get().status).toBe('ready');
    host.finish.doResolve();
  });

  it.each([
    ['a stream', false],
    ['no stream', true],
  ])(
    'sends a queued turn while the stopped host never returns, with %s (O7)',
    async (_case, silent) => {
      const host = streamingHost('chunk', { silent });
      const instance = await chatWith(host);
      void instance.messaging.send('First');
      const second = instance.messaging.send('Second');
      await waitFor(() => expect(host.turns).toHaveLength(1));

      await instance.messaging.stop();

      await waitFor(() => expect(host.turns).toHaveLength(2));
      expect(host.turns[1].request.input.text).toBe('Second');
      expect(host.turns[1].signal.aborted).toBe(false);
      host.finish.doResolve();
      await second;
    }
  );

  it('does not cancel the next turn when a handler ends the stopped one', async () => {
    const host = streamingHost('chunk', { silent: true });
    const instance = await chatWith(host);
    void instance.messaging.send('First');
    void instance.messaging.send('Second');
    await waitFor(() => expect(host.turns).toHaveLength(1));
    // The host's handler ends its first turn, so the queue moves on before the stop cancels.
    instance.on({
      type: BusEventType.STOP_STREAMING,
      handler: async () => {
        host.holds[0].doResolve();
        await waitFor(() => expect(host.turns).toHaveLength(2));
      },
    });

    await instance.messaging.stop();

    expect(host.turns[1].signal.aborted).toBe(false);
    expect(instance.state.get().status).toBe('submitted');
    host.finish.doResolve();
  });

  it('leaves a message to a human agent alone', async () => {
    const host = streamingHost('chunk');
    const instance = await chatWith(host);
    const { serviceManager } = instance;
    (serviceManager as any).instance = instance;
    (serviceManager as any).fire = (busEvent: any) =>
      serviceManager.eventBus.fire(busEvent, instance);
    const pendingDesk = resolvablePromise<void>();
    const impl = createHumanAgentService(serviceManager);
    (impl as any).serviceDesk = {
      getName: () => 'stub-desk',
      startChat: jest.fn().mockResolvedValue(undefined),
      endChat: jest.fn().mockResolvedValue(undefined),
      sendMessageToAgent: () => pendingDesk,
    } as unknown as ServiceDesk;
    (impl as any).chatStarted = true;
    (serviceManager as any).humanAgentService = impl;
    serviceManager.store.dispatch(
      actions.changeState({
        persistedToBrowserStorage: { humanAgentState: { isConnected: true } },
      })
    );

    void impl.sendMessageToAgent('Hi', []);
    await waitFor(() => expect(instance.state.get().status).toBe('submitted'));
    await instance.messaging.stop();

    expect(host.log).toEqual([]);
    expect(instance.state.get().status).toBe('submitted');
    pendingDesk.doResolve();
  });

  it('cancels once for overlapping calls (O8)', async () => {
    const host = streamingHost('chunk');
    const instance = await chatWith(host);
    void instance.messaging.send('Hello');
    await waitFor(() => expect(instance.state.get().status).toBe('streaming'));

    await Promise.all([
      instance.messaging.stop(),
      instance.messaging.stop(),
      requestStopFromInput(instance.serviceManager, () => undefined),
    ]);

    expect(host.log).toEqual([
      'stopStreaming',
      `abort ${CancellationReason.STOP_STREAMING}`,
    ]);
    host.finish.doResolve();
  });

  it('stops a stream that is not marked cancellable (user decision, November 10)', async () => {
    const host = streamingHost('chunk', { cancellable: false });
    const instance = await chatWith(host);
    const sending = instance.messaging.send('Hello');
    await waitFor(() => expect(instance.state.get().status).toBe('streaming'));

    await instance.messaging.stop();
    await sending;

    expect(host.turns[0].signal.aborted).toBe(true);
    expect(instance.state.get().status).toBe('ready');
    host.finish.doResolve();
  });

  it.each<Stream>(['chunk', 'upsert'])(
    'leaves the same state and events as the built-in button for a %s stream (O13)',
    async (stream) => {
      const run = async (stop: (instance: ChatInstance) => Promise<void>) => {
        sessionStorage.clear();
        localStorage.clear();
        const host = streamingHost(stream);
        const instance = await chatWith(host);
        const events: string[] = [];
        instance.on(
          Object.values(BusEventType).map((type) => ({
            type,
            handler: () => {
              events.push(type);
            },
          }))
        );
        const sending = instance.messaging.send('Hello');
        await waitFor(() =>
          expect(instance.state.get().status).toBe('streaming')
        );
        await stop(instance);
        await sending;
        const { status, error, messages } = instance.state.get();
        const result = {
          events,
          log: host.log,
          status,
          error,
          // Request IDs are generated; compare what each message says.
          messages: messages.map((message) =>
            'output' in message
              ? message.output.generic.map(
                  (item) => 'text' in item && item.text
                )
              : (message.input as { text?: string }).text
          ),
          buttonState:
            instance.serviceManager.store.getState().assistantInputState
              .stopStreamingButtonState,
        };
        host.finish.doResolve();
        setupAfterEach();
        return result;
      };

      const button = await run((instance) =>
        requestStopFromInput(instance.serviceManager, () => undefined)
      );
      const host = await run((instance) => instance.messaging.stop());

      expect(host).toEqual(button);
      expect(button.log).toEqual([
        'stopStreaming',
        `abort ${CancellationReason.STOP_STREAMING}`,
      ]);
    }
  );
});
