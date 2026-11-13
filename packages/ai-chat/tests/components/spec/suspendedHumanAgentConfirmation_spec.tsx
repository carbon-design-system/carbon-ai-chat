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
import languagePack from '../../../src/chat/languages/en.json';
import { createTestViewState } from '../../test_helpers';

jest.mock('../../../src/chat/hooks/useSelector', () => ({
  useSelector: () => jest.requireActual('../../../src/chat/languages/en.json'),
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

function renderSuspendedCard() {
  const startChat = jest.fn();
  const requestFocus = jest.fn();
  const props = {
    localMessage: { item: {}, ui_state: { id: 'new-request' } },
    originalMessage: {},
    disableUserInputs: false,
    serviceManager: { humanAgentService: { startChat } },
    humanAgentState: {},
    persistedHumanAgentState: { isSuspended: true },
    agentDisplayState: {},
    requestFocus,
  } as unknown as React.ComponentProps<typeof RealConnectToHumanAgent>;
  const viewState = createTestViewState({
    serviceManager: props.serviceManager,
  });
  const currentConfirmation = () =>
    viewState.getSnapshot().humanAgentConfirmation;
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
    viewState,
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
      currentConfirmation,
      confirmation,
    } = renderSuspendedCard();
    expect(startChat).not.toHaveBeenCalled();
    expect(confirmation.title).toBe(
      languagePack.agent_confirmSuspendedEndChatTitle
    );
    expect(confirmation.message).toBe(
      languagePack.agent_confirmSuspendedEndChatMessage
    );

    act(() => confirmation.onConfirm());

    expect(startChat).toHaveBeenCalledWith(
      props.localMessage,
      props.originalMessage
    );
    expect(currentConfirmation()).toBeNull();
    act(() => jest.runOnlyPendingTimers());
    expect(requestFocus).toHaveBeenCalledTimes(1);
  });

  it('clears its confirmation on unmount', () => {
    const { unmount, currentConfirmation, startChat } = renderSuspendedCard();

    unmount();

    expect(currentConfirmation()).toBeNull();
    expect(startChat).not.toHaveBeenCalled();
  });

  it('leaves a newer confirmation open when it unmounts', () => {
    const { unmount, viewState, currentConfirmation, confirmation, startChat } =
      renderSuspendedCard();
    const newerConfirmation = { ...confirmation };
    act(() => {
      viewState.openConfirmation(newerConfirmation);
    });

    unmount();

    expect(currentConfirmation()).toBe(newerConfirmation);
    expect(startChat).not.toHaveBeenCalled();
  });
});
