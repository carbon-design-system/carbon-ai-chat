/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { MessageResponse } from '../../../src/types/messaging/Messages';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import {
  BusEventPreSend,
  BusEventType,
} from '../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

describe('request identity in public status', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('finishes the active request after a pre-send handler changes its ID', async () => {
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      messaging: { skipWelcome: true, customSendMessage },
    });
    instance.on({
      type: BusEventType.PRE_SEND,
      handler: (event: BusEventPreSend) => {
        event.data.id = 'host-request';
      },
    });

    await act(async () => {
      await instance.send('hello');
    });

    expect(customSendMessage).toHaveBeenCalledTimes(1);
    expect(customSendMessage.mock.calls[0][0].id).toBe('host-request');
    expect(instance.state.get().status).toBe('ready');
  });

  it('clears a renamed request when Stop runs during an awaited pre-send event', async () => {
    const entered = resolvablePromise<void>();
    const release = resolvablePromise<void>();
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        messaging: { skipWelcome: true, customSendMessage },
      });
    instance.on({
      type: BusEventType.PRE_SEND,
      handler: async (event: BusEventPreSend) => {
        event.data.id = 'stopped-host-request';
        entered.doResolve();
        await release;
      },
    });
    const send = instance.send('hello');
    await entered;
    await act(async () =>
      serviceManager.messageService.cancelCurrentMessageRequest()
    );
    release.doResolve();
    await send;
    expect(customSendMessage).not.toHaveBeenCalled();
    expect(instance.state.get().status).toBe('ready');
  });

  it('recognizes a response to the renamed request before its pre-send event settles', async () => {
    const entered = resolvablePromise<void>();
    const release = resolvablePromise<void>();
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      messaging: {
        skipWelcome: true,
        customSendMessage: async () => undefined,
      },
    });
    instance.on({
      type: BusEventType.PRE_SEND,
      handler: async (event: BusEventPreSend) => {
        event.data.id = 'responded-host-request';
        entered.doResolve();
        await release;
      },
    });
    const send = instance.send('hello');
    await entered;
    await act(async () =>
      instance.messaging.addMessage({
        id: 'response',
        request_id: 'responded-host-request',
        output: { generic: [] },
      })
    );
    const statusDuringEvent = instance.state.get().status;
    release.doResolve();
    await send;
    expect(statusDuringEvent).toBe('streaming');
    expect(instance.state.get().status).toBe('ready');
  });

  it('does not retain a renamed failed request after the next send succeeds', async () => {
    const customSendMessage = jest
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValue(undefined);
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      messaging: { skipWelcome: true, customSendMessage },
    });
    let count = 0;
    instance.on({
      type: BusEventType.PRE_SEND,
      handler: (event: BusEventPreSend) => {
        event.data.id = `host-request-${++count}`;
      },
    });
    await expect(instance.send('first')).rejects.toThrow('{}');
    expect(instance.state.get().status).toBe('error');
    await instance.send('second');
    expect(instance.state.get().status).toBe('ready');
  });

  it('releases renamed response ownership when a streamed send fails', async () => {
    const customSendMessage = jest
      .fn()
      .mockImplementationOnce(async (request, _options, chat) => {
        await chat.messaging.upsertMessage(
          'failed-response',
          MessageState.STREAMING,
          (): MessageResponse => ({
            id: 'failed-response',
            request_id: request.id,
            output: { generic: [] },
          })
        );
        throw new Error('failed');
      })
      .mockResolvedValue(undefined);
    const { instance } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      messaging: { skipWelcome: true, customSendMessage },
    });
    let count = 0;
    instance.on({
      type: BusEventType.PRE_SEND,
      handler: (event: BusEventPreSend) => {
        event.data.id = `streaming-host-request-${++count}`;
      },
    });
    await expect(instance.send('first')).rejects.toThrow('{}');
    expect(instance.state.get().status).toBe('error');
    await instance.send('second');
    expect(instance.state.get().status).toBe('ready');
  });
});
