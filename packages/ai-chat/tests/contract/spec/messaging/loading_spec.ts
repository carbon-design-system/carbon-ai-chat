/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  ChatInstance,
  PublicConfigMessaging,
} from '../../../../src/aiChatEntry';
import {
  SentRequest,
  advance,
  contractChat,
  contractSetup,
  fakeBackend,
  instanceSender,
  startSend,
  textResponse,
} from '../../helpers';

/** The two message-loading fields a host reads. */
function loading(instance: ChatInstance) {
  const { isMessageLoadingCounter, isMessageLoadingText } = instance.getState();
  return { counter: isMessageLoadingCounter, text: isMessageLoadingText };
}

/** Runs a host call that changes chat state. */
async function host(call: () => unknown): Promise<void> {
  await act(async () => {
    await call();
  });
}

// @covers instance.updateIsMessageLoadingCounter state.isMessageLoadingCounter
// @covers state.isMessageLoadingText
describe('updateIsMessageLoadingCounter', () => {
  contractSetup();

  async function mount() {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true, customSendMessage: () => undefined },
    });
    return instance;
  }

  it('starts at 0 with no text', async () => {
    const instance = await mount();
    expect(loading(instance)).toEqual({ counter: 0, text: undefined });
  });

  it('counts each increase and shows the text of the latest call', async () => {
    const instance = await mount();
    await host(() =>
      instance.updateIsMessageLoadingCounter('increase', 'Thinking...')
    );
    expect(loading(instance)).toEqual({ counter: 1, text: 'Thinking...' });
    await host(() => instance.updateIsMessageLoadingCounter('increase'));
    expect(loading(instance)).toEqual({ counter: 2, text: undefined });
  });

  it('changes only the text when the direction is undefined', async () => {
    const instance = await mount();
    await host(() =>
      instance.updateIsMessageLoadingCounter('increase', 'Thinking...')
    );
    await host(() =>
      instance.updateIsMessageLoadingCounter(undefined, 'Searching...')
    );
    expect(loading(instance)).toEqual({ counter: 1, text: 'Searching...' });
  });

  it('keeps no text while the counter is 0', async () => {
    const instance = await mount();
    await host(() =>
      instance.updateIsMessageLoadingCounter(undefined, 'Searching...')
    );
    expect(loading(instance)).toEqual({ counter: 0, text: undefined });
  });

  it('decreases by one, clearing the text unless the call passes one', async () => {
    const instance = await mount();
    await host(() => instance.updateIsMessageLoadingCounter('increase'));
    await host(() => instance.updateIsMessageLoadingCounter('increase', 'A'));
    await host(() =>
      instance.updateIsMessageLoadingCounter('decrease', 'Still going')
    );
    expect(loading(instance)).toEqual({ counter: 1, text: 'Still going' });
    await host(() => instance.updateIsMessageLoadingCounter('decrease'));
    expect(loading(instance)).toEqual({ counter: 0, text: undefined });
  });

  // Two floors keep the counter at 0: the instance call ignores a decrease at
  // 0, and the chat's own count never goes below 0. With only the first gone,
  // the second leaves the same state and fires no change, so no public
  // observable tells them apart here. The chat's own floor is pinned on its
  // own in "floors the counter at 0 when its indicator ends after a reset".
  it('never decreases below 0', async () => {
    const instance = await mount();
    await host(() => instance.updateIsMessageLoadingCounter('decrease'));
    await host(() => instance.updateIsMessageLoadingCounter('increase'));
    expect(loading(instance).counter).toBe(1);
  });

  it('resets the counter to 0 and clears the text', async () => {
    const instance = await mount();
    await host(() => instance.updateIsMessageLoadingCounter('increase', 'A'));
    await host(() => instance.updateIsMessageLoadingCounter('increase', 'B'));
    await host(() => instance.updateIsMessageLoadingCounter('reset'));
    expect(loading(instance)).toEqual({ counter: 0, text: undefined });
  });

  it('leaves the conversation status alone', async () => {
    const instance = await mount();
    await host(() => instance.updateIsMessageLoadingCounter('increase'));
    expect(instance.getState().status).toBe('ready');
  });
});

// @covers config.messaging.messageLoadingIndicatorTimeoutSecs
// @covers state.isMessageLoadingCounter instance.messaging.addMessage
describe('messageLoadingIndicatorTimeoutSecs', () => {
  contractSetup();

  /**
   * Mounts with real timers, then switches to fake ones so the send's
   * loading timer is a fake one, and starts a send the backend holds open.
   */
  async function pendingSend(
    messaging: Partial<PublicConfigMessaging> = {}
  ): Promise<{ instance: ChatInstance; sent: SentRequest }> {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
        ...messaging,
      },
    });
    jest.useFakeTimers();
    const { sent, done } = await startSend(
      instanceSender(instance, backend),
      'hello'
    );
    done.catch((): void => undefined);
    return { instance, sent };
  }

  it('counts one loading indicator 4 seconds into a send by default', async () => {
    const { instance } = await pendingSend();
    await advance(3999);
    expect(loading(instance).counter).toBe(0);
    await advance(1);
    expect(loading(instance).counter).toBe(1);
  });

  it('uses the configured wait', async () => {
    const { instance } = await pendingSend({
      messageLoadingIndicatorTimeoutSecs: 1,
    });
    await advance(999);
    expect(loading(instance).counter).toBe(0);
    await advance(1);
    expect(loading(instance).counter).toBe(1);
  });

  it('never counts the indicator on its own when set to 0', async () => {
    const { instance } = await pendingSend({
      messageLoadingIndicatorTimeoutSecs: 0,
      messageTimeoutSecs: 0,
    });
    await advance(600_000);
    expect(loading(instance).counter).toBe(0);
  });

  it('removes the indicator it counted when a response arrives', async () => {
    const { instance, sent } = await pendingSend({
      messageLoadingIndicatorTimeoutSecs: 1,
    });
    await advance(1000);
    expect(loading(instance).counter).toBe(1);
    await host(() =>
      instance.messaging.addMessage(
        textResponse('hi', 'r1', { request_id: sent.request.id })
      )
    );
    expect(loading(instance).counter).toBe(0);
  });

  // @covers instance.updateIsMessageLoadingCounter
  it('floors the counter at 0 when its indicator ends after a reset', async () => {
    const { instance, sent } = await pendingSend({
      messageLoadingIndicatorTimeoutSecs: 1,
    });
    await advance(1000);
    expect(loading(instance).counter).toBe(1);
    await host(() => instance.updateIsMessageLoadingCounter('reset'));
    // The response removes the indicator the chat counted, from a count the
    // host already reset.
    await host(() =>
      instance.messaging.addMessage(
        textResponse('hi', 'r1', { request_id: sent.request.id })
      )
    );
    expect(loading(instance).counter).toBe(0);
  });

  it('counts no indicator when a response arrives before the wait ends', async () => {
    const { instance, sent } = await pendingSend({
      messageLoadingIndicatorTimeoutSecs: 1,
    });
    await advance(500);
    await host(() =>
      instance.messaging.addMessage(
        textResponse('hi', 'r1', { request_id: sent.request.id })
      )
    );
    await advance(5000);
    expect(loading(instance).counter).toBe(0);
  });
});

// @covers instance.messaging.restartConversation
// @covers config.messaging.messageLoadingIndicatorTimeoutSecs
// @covers instance.updateIsMessageLoadingCounter state.isMessageLoadingCounter
describe('restart and the message-loading counter', () => {
  contractSetup();

  it('clears a host-set counter on restart', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true, customSendMessage: () => undefined },
    });
    await host(() => instance.updateIsMessageLoadingCounter('increase', 'A'));
    await host(() => instance.messaging.restartConversation());
    expect(loading(instance)).toEqual({ counter: 0, text: undefined });
  });

  it('keeps a host-set counter on restart when the indicator wait is 0', async () => {
    const { instance } = await contractChat({
      messaging: {
        skipWelcome: true,
        messageLoadingIndicatorTimeoutSecs: 0,
        customSendMessage: () => undefined,
      },
    });
    await host(() => instance.updateIsMessageLoadingCounter('increase', 'A'));
    await host(() => instance.messaging.restartConversation());
    expect(loading(instance)).toEqual({ counter: 1, text: 'A' });
  });
});

// @covers instance.updateIsChatLoadingCounter state.isHydratingCounter
// @covers state.status
describe('updateIsChatLoadingCounter', () => {
  contractSetup();

  async function mount() {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true, customSendMessage: () => undefined },
    });
    return instance;
  }

  const hydrating = (instance: ChatInstance) =>
    instance.getState().isHydratingCounter;

  it('counts increases and decreases in isHydratingCounter', async () => {
    const instance = await mount();
    expect(hydrating(instance)).toBe(0);
    await host(() => instance.updateIsChatLoadingCounter('increase'));
    await host(() => instance.updateIsChatLoadingCounter('increase'));
    expect(hydrating(instance)).toBe(2);
    await host(() => instance.updateIsChatLoadingCounter('decrease'));
    expect(hydrating(instance)).toBe(1);
  });

  // As with the message-loading counter, the instance call's floor and the
  // chat's own floor leave the same state, so this test needs both gone to
  // fail. The chat's own floor is pinned on its own in "floors the counter at
  // 0 when the chat's own loading ends after a reset".
  it('never decreases below 0', async () => {
    const instance = await mount();
    await host(() => instance.updateIsChatLoadingCounter('decrease'));
    await host(() => instance.updateIsChatLoadingCounter('increase'));
    expect(hydrating(instance)).toBe(1);
  });

  it("floors the counter at 0 when the chat's own loading ends after a reset", async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    // The chat counts itself loading until its welcome request settles.
    const welcome = await backend.next();
    expect(hydrating(instance)).toBe(1);
    await host(() => instance.updateIsChatLoadingCounter('reset'));
    await host(() => welcome.resolve());
    await waitFor(() => expect(instance.getState().status).toBe('ready'));
    expect(hydrating(instance)).toBe(0);
  });

  it('leaves status ready while the counter is above 0', async () => {
    const instance = await mount();
    await host(() => instance.updateIsChatLoadingCounter('increase'));
    expect(hydrating(instance)).toBe(1);
    // Only the chat's own hydration sets `loading`.
    expect(instance.getState().status).toBe('ready');
  });

  it("resets the chat-loading counter to 0 on 'reset', and leaves the message-loading one", async () => {
    const instance = await mount();
    await host(() => instance.updateIsChatLoadingCounter('increase'));
    await host(() => instance.updateIsChatLoadingCounter('increase'));
    await host(() => instance.updateIsMessageLoadingCounter('increase', 'A'));
    await host(() => instance.updateIsChatLoadingCounter('reset'));
    expect(hydrating(instance)).toBe(0);
    expect(loading(instance)).toEqual({ counter: 1, text: 'A' });
  });
});
