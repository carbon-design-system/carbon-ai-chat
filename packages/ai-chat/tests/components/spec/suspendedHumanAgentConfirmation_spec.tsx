/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RealConnectToHumanAgent } from '../../../src/chat/components-legacy/responseTypes/humanAgent/RealConnectToHumanAgent';
import { ChatContext } from '../../../src/chat/contexts/ChatContext';
import languagePack from '../../../src/sdk/languages/en.json';
import { answerPrompt, openPrompt } from '../../../src/chat/state';
import { createTestViewState, makeConfigStore } from '../../test_helpers';

jest.mock('../../../src/chat/hooks/useSelector', () => ({
  useSelector: () => jest.requireActual('../../../src/sdk/languages/en.json'),
}));

jest.mock('@carbon/ai-chat-components/es/react/card.js', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('../../../src/chat/components/carbon/Button', () => ({
  __esModule: true,
  default: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

/** Runs the microtask in which the card checks whether its mount detached. */
function flushMicrotasks() {
  act(() => jest.runAllTicks());
}

function renderSuspendedCard() {
  const startChat = jest.fn();
  const requestFocus = jest.fn();
  const focusChat = jest.fn();
  const props = {
    localMessage: { item: {}, ui_state: { id: 'new-request' } },
    originalMessage: {},
    disableUserInputs: false,
    serviceManager: {
      humanAgentService: { startChat },
      store: makeConfigStore({}),
      view: { current: { instance: { requestFocus: focusChat } } },
    },
    humanAgent: { isSuspended: true },
    agentDisplayState: {},
    requestFocus,
  } as unknown as React.ComponentProps<typeof RealConnectToHumanAgent>;
  const viewState = createTestViewState({
    serviceManager: props.serviceManager,
  });
  const store = props.serviceManager.store as ReturnType<
    typeof makeConfigStore
  >;
  const currentConfirmation = () => store.getState().view.prompt;
  const view = render(
    <ChatContext.Provider value={viewState}>
      <RealConnectToHumanAgent {...props} />
    </ChatContext.Provider>
  );
  fireEvent.click(
    screen.getByRole('button', { name: languagePack.agent_startChat })
  );
  const confirmation = currentConfirmation();
  return {
    ...view,
    props,
    startChat,
    requestFocus,
    focusChat,
    viewState,
    store,
    currentConfirmation,
    confirmation,
  };
}

describe('suspended human agent card confirmation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts the new request only after confirmation and clears its context', () => {
    const {
      props,
      startChat,
      requestFocus,
      focusChat,
      store,
      currentConfirmation,
      confirmation,
    } = renderSuspendedCard();
    expect(startChat).not.toHaveBeenCalled();
    expect(confirmation.kind).toBe('humanAgent');
    expect(confirmation.title).toBe(
      languagePack.agent_confirmSuspendedEndChatTitle
    );
    expect(confirmation.message).toBe(
      languagePack.agent_confirmSuspendedEndChatMessage
    );

    act(() => answerPrompt(store, confirmation.id, 'confirm'));

    expect(startChat).toHaveBeenCalledWith(
      props.localMessage,
      props.originalMessage
    );
    expect(currentConfirmation()).toBeNull();
    act(() => jest.runOnlyPendingTimers());
    expect(requestFocus).toHaveBeenCalledTimes(1);
    expect(focusChat).not.toHaveBeenCalled();
  });

  it('clears its confirmation on unmount', () => {
    const { unmount, currentConfirmation, startChat } = renderSuspendedCard();

    unmount();
    flushMicrotasks();

    expect(currentConfirmation()).toBeNull();
    expect(startChat).not.toHaveBeenCalled();
  });

  it('leaves a newer confirmation open when it unmounts', () => {
    const { unmount, store, currentConfirmation, confirmation, startChat } =
      renderSuspendedCard();
    act(() => {
      openPrompt(
        store,
        { kind: 'humanAgent', title: confirmation.title },
        { onConfirm: jest.fn() }
      );
    });
    const newerConfirmation = currentConfirmation();
    expect(newerConfirmation.id).not.toBe(confirmation.id);

    unmount();
    flushMicrotasks();

    expect(currentConfirmation()).toBe(newerConfirmation);
    expect(startChat).not.toHaveBeenCalled();
  });

  it('keeps its confirmation open when its mount detaches, and still starts the request', () => {
    const {
      props,
      unmount,
      viewState,
      store,
      currentConfirmation,
      confirmation,
      startChat,
      requestFocus,
      focusChat,
    } = renderSuspendedCard();

    // A React host unmounts the card first; the container detaches its mount
    // in a microtask queued when the element left the page.
    unmount();
    viewState.disconnect();
    flushMicrotasks();

    expect(currentConfirmation()).toBe(confirmation);
    act(() => answerPrompt(store, confirmation.id, 'confirm'));
    expect(startChat).toHaveBeenCalledWith(
      props.localMessage,
      props.originalMessage
    );
    expect(currentConfirmation()).toBeNull();
    // The card is gone, so focus goes to the chat instead of to it.
    act(() => jest.runOnlyPendingTimers());
    expect(requestFocus).not.toHaveBeenCalled();
    expect(focusChat).toHaveBeenCalledTimes(1);
  });

  it('cancels without starting the request', () => {
    const { store, currentConfirmation, confirmation, startChat } =
      renderSuspendedCard();

    act(() => answerPrompt(store, confirmation.id, 'cancel'));

    expect(currentConfirmation()).toBeNull();
    expect(startChat).not.toHaveBeenCalled();
  });
});
