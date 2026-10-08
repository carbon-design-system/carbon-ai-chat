/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Behavior of `input.isStopStreamingButtonVisible` and
 * `input.isStopStreamingButtonDisabled`, which let the host show the stop
 * streaming button for work that outlives a request:
 *  - the config flags combine with the chat's own button state by OR,
 *  - the chat hiding its own button never hides a host-shown one,
 *  - a click fires STOP_STREAMING and re-enables a host-shown button after,
 *  - restarting the conversation leaves the host flag in place,
 *  - the human-agent input ignores the flags.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import { AppState } from '../../../src/types/state/AppState';
import {
  selectStopStreamingButtonDisabled,
  selectStopStreamingButtonVisible,
} from '../../../src/chat/store/selectors';
import {
  createAppConfig,
  createInitialState,
} from '../../../src/chat/store/doCreateStore';
import {
  getChatShadowRoot,
  mockCustomSendMessage,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

function stateFor(config: PublicConfig): AppState {
  return createInitialState(createAppConfig(config));
}

function withButtonState(
  state: AppState,
  isVisible: boolean,
  isDisabled = false
): AppState {
  return {
    ...state,
    assistantInputState: {
      ...state.assistantInputState,
      stopStreamingButtonState: {
        ...state.assistantInputState.stopStreamingButtonState,
        isVisible,
        isDisabled,
      },
    },
  };
}

function connectedToHumanAgent(state: AppState): AppState {
  return {
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      humanAgentState: {
        ...state.persistedToBrowserStorage.humanAgentState,
        isConnected: true,
      },
    },
  };
}

describe('stop streaming button selectors', () => {
  it('hides and enables the button with no config and no stream', () => {
    const state = stateFor({});
    expect(selectStopStreamingButtonVisible(state)).toBe(false);
    expect(selectStopStreamingButtonDisabled(state)).toBe(false);
  });

  it('shows the button when the host config asks for it', () => {
    const state = stateFor({ input: { isStopStreamingButtonVisible: true } });
    expect(selectStopStreamingButtonVisible(state)).toBe(true);
  });

  it('shows the button when the chat shows it, without host config', () => {
    const state = withButtonState(stateFor({}), true);
    expect(selectStopStreamingButtonVisible(state)).toBe(true);
  });

  it('disables the button when either the chat or the host config does', () => {
    expect(
      selectStopStreamingButtonDisabled(
        stateFor({ input: { isStopStreamingButtonDisabled: true } })
      )
    ).toBe(true);
    expect(
      selectStopStreamingButtonDisabled(
        withButtonState(stateFor({}), true, true)
      )
    ).toBe(true);
  });

  it('ignores the host config while connected to a human agent', () => {
    const state = connectedToHumanAgent(
      stateFor({
        input: {
          isStopStreamingButtonVisible: true,
          isStopStreamingButtonDisabled: true,
        },
      })
    );
    expect(selectStopStreamingButtonVisible(state)).toBe(false);
    expect(selectStopStreamingButtonDisabled(state)).toBe(false);
  });
});

describe('stop streaming button from input config', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  function props(
    input: PublicConfig['input'],
    messaging: PublicConfig['messaging'] = {
      customSendMessage: mockCustomSendMessage,
    }
  ): Partial<ChatContainerProps> {
    return {
      messaging,
      exposeServiceManagerForTesting: true,
      openChatByDefault: true,
      input,
    };
  }

  async function renderChat(initialProps: Partial<ChatContainerProps>) {
    let instance: ChatInstance = null;
    let rendered = false;
    const onBeforeRender = jest.fn((value: ChatInstance) => {
      instance = value;
    });
    const onAfterRender = jest.fn(() => {
      rendered = true;
    });
    const result = render(
      React.createElement(ChatContainer, {
        ...initialProps,
        onBeforeRender,
        onAfterRender,
      })
    );
    await waitFor(
      () => {
        expect(instance).not.toBeNull();
        expect(rendered).toBe(true);
      },
      { timeout: 5000 }
    );
    const rerender = (nextProps: Partial<ChatContainerProps>) =>
      result.rerender(
        React.createElement(ChatContainer, {
          ...nextProps,
          onBeforeRender,
          onAfterRender,
        })
      );
    return { instance, store: instance.serviceManager.store, rerender };
  }

  function getSendControl(): HTMLElement & {
    isStopStreamingButtonVisible: boolean;
    isStopStreamingButtonDisabled: boolean;
  } {
    return getChatShadowRoot()?.querySelector(
      'cds-aichat-input-send-control'
    ) as any;
  }

  it('shows and hides the button as the host toggles the flag', async () => {
    const { store, rerender } = await renderChat(
      props({ isStopStreamingButtonVisible: true })
    );

    expect(selectStopStreamingButtonVisible(store.getState())).toBe(true);
    await waitFor(() =>
      expect(getSendControl()?.isStopStreamingButtonVisible).toBe(true)
    );

    rerender(props({ isStopStreamingButtonVisible: false }));

    await waitFor(() =>
      expect(selectStopStreamingButtonVisible(store.getState())).toBe(false)
    );
    await waitFor(() =>
      expect(getSendControl()?.isStopStreamingButtonVisible).toBe(false)
    );
  });

  it('renders the button disabled when the host sets isStopStreamingButtonDisabled', async () => {
    await renderChat(
      props({
        isStopStreamingButtonVisible: true,
        isStopStreamingButtonDisabled: true,
      })
    );

    await waitFor(() =>
      expect(getSendControl()?.isStopStreamingButtonDisabled).toBe(true)
    );
  });

  it('fires STOP_STREAMING on click and re-enables the button after the handlers return', async () => {
    const { instance, store } = await renderChat(
      props({ isStopStreamingButtonVisible: true })
    );

    let disabledDuringHandler: boolean | undefined;
    const handler = jest.fn(() => {
      disabledDuringHandler = selectStopStreamingButtonDisabled(
        store.getState()
      );
    });
    instance.on({ type: BusEventType.STOP_STREAMING, handler });

    await waitFor(() => expect(getSendControl()).toBeTruthy());
    await act(async () => {
      getSendControl().dispatchEvent(
        new CustomEvent('cds-aichat-input-stop-streaming', {
          bubbles: true,
          composed: true,
        })
      );
    });

    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(disabledDuringHandler).toBe(true);
    await waitFor(() =>
      expect(selectStopStreamingButtonDisabled(store.getState())).toBe(false)
    );
    expect(selectStopStreamingButtonVisible(store.getState())).toBe(true);
  });

  it('keeps a host-shown button visible after a pending send ends', async () => {
    let resolveSend: () => void;
    const customSendMessage = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        })
    );
    const { instance, store } = await renderChat(
      props(
        { isStopStreamingButtonVisible: true },
        {
          customSendMessage,
          showStopButtonImmediately: true,
          skipWelcome: true,
        }
      )
    );

    let sendPromise: Promise<void>;
    await act(async () => {
      sendPromise = instance.send('Hello');
    });
    await waitFor(() => expect(customSendMessage).toHaveBeenCalled());
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(true);

    await act(async () => {
      resolveSend();
      await sendPromise;
    });

    // The chat hid the button it showed for the send...
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
    // ...but the host flag still shows it.
    expect(selectStopStreamingButtonVisible(store.getState())).toBe(true);
  });

  it('hides the chat-shown button when the send ends without the host flag', async () => {
    let resolveSend: () => void;
    const customSendMessage = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        })
    );
    const { instance, store } = await renderChat(
      props(
        {},
        {
          customSendMessage,
          showStopButtonImmediately: true,
          skipWelcome: true,
        }
      )
    );

    let sendPromise: Promise<void>;
    await act(async () => {
      sendPromise = instance.send('Hello');
    });
    await waitFor(() =>
      expect(selectStopStreamingButtonVisible(store.getState())).toBe(true)
    );

    await act(async () => {
      resolveSend();
      await sendPromise;
    });

    expect(selectStopStreamingButtonVisible(store.getState())).toBe(false);
  });

  it('keeps a host-shown button visible after a restart', async () => {
    const { instance, store } = await renderChat(
      props({ isStopStreamingButtonVisible: true })
    );

    await act(async () => {
      await instance.messaging.restartConversation();
    });

    expect(selectStopStreamingButtonVisible(store.getState())).toBe(true);
  });
});
