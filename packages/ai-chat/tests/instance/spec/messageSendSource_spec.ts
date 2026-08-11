/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Regression tests for MessageSendSource — ensures HOME_SCREEN_INPUT and
 * MESSAGE_INPUT are preserved end-to-end through the send pipeline.
 *
 * #1867 — the regression introduced in #864 collapsed the home-screen input's
 * onSendInput callback into a single unconditional MESSAGE_INPUT call, silently
 * dropping HOME_SCREEN_INPUT. These tests verify that whatever source is
 * passed into sendWithCatch reaches the SEND bus event unchanged, and that the
 * two surfaces are reported as distinct sources.
 */

import {
  BusEventType,
  MessageSendSource,
} from '../../../src/types/events/eventBusTypes';
import { createMessageRequestForText } from '../../../src/chat/utils/messageUtils';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

describe('MessageSendSource — send surface distinction', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('propagates HOME_SCREEN_INPUT source to the SEND event', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const sendEvents: any[] = [];
    instance.on([
      {
        type: BusEventType.SEND,
        handler: (event: any) => {
          sendEvents.push(event);
        },
      },
    ]);

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText('hello from home screen'),
      MessageSendSource.HOME_SCREEN_INPUT
    );

    expect(sendEvents).toHaveLength(1);
    expect(sendEvents[0].source).toBe(MessageSendSource.HOME_SCREEN_INPUT);
  });

  it('propagates MESSAGE_INPUT source to the SEND event', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const sendEvents: any[] = [];
    instance.on([
      {
        type: BusEventType.SEND,
        handler: (event: any) => {
          sendEvents.push(event);
        },
      },
    ]);

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText('hello from message list'),
      MessageSendSource.MESSAGE_INPUT
    );

    expect(sendEvents).toHaveLength(1);
    expect(sendEvents[0].source).toBe(MessageSendSource.MESSAGE_INPUT);
  });

  it('HOME_SCREEN_INPUT and MESSAGE_INPUT produce distinct source values', () => {
    expect(MessageSendSource.HOME_SCREEN_INPUT).not.toBe(
      MessageSendSource.MESSAGE_INPUT
    );
  });

  it('propagates HOME_SCREEN_INPUT source to the PRE_SEND event', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const preSendEvents: any[] = [];
    instance.on([
      {
        type: BusEventType.PRE_SEND,
        handler: (event: any) => {
          preSendEvents.push(event);
        },
      },
    ]);

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText('home screen pre-send'),
      MessageSendSource.HOME_SCREEN_INPUT
    );

    expect(preSendEvents).toHaveLength(1);
    expect(preSendEvents[0].source).toBe(MessageSendSource.HOME_SCREEN_INPUT);
  });

  it('customSendMessage receives HOME_SCREEN_INPUT in busEventSend', async () => {
    const customSendMessage = jest.fn();
    const config = {
      ...createBaseConfig(),
      messaging: { customSendMessage },
    };

    const { serviceManager } = await renderChatAndGetInstanceWithStore(config);

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText('home screen via custom send'),
      MessageSendSource.HOME_SCREEN_INPUT
    );

    expect(customSendMessage).toHaveBeenCalledTimes(1);
    const [, options] = customSendMessage.mock.calls[0];
    expect(options.busEventSend?.source).toBe(
      MessageSendSource.HOME_SCREEN_INPUT
    );
  });

  it('customSendMessage receives MESSAGE_INPUT in busEventSend', async () => {
    const customSendMessage = jest.fn();
    const config = {
      ...createBaseConfig(),
      messaging: { customSendMessage },
    };

    const { serviceManager } = await renderChatAndGetInstanceWithStore(config);

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText('message list via custom send'),
      MessageSendSource.MESSAGE_INPUT
    );

    expect(customSendMessage).toHaveBeenCalledTimes(1);
    const [, options] = customSendMessage.mock.calls[0];
    expect(options.busEventSend?.source).toBe(MessageSendSource.MESSAGE_INPUT);
  });
});
