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
import { HumanAgentConfirmationContext } from '../../../src/chat/contexts/HumanAgentConfirmationContext';
import languagePack from '../../../src/chat/languages/en.json';

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
  const setConfirmation = jest.fn();
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
  const view = render(
    <HumanAgentConfirmationContext.Provider value={setConfirmation}>
      <RealConnectToHumanAgent {...props} />
    </HumanAgentConfirmationContext.Provider>
  );
  fireEvent.click(
    screen.getByRole('button', { name: languagePack.agent_startChat })
  );
  const confirmation = setConfirmation.mock.calls[0][0];
  return {
    ...view,
    props,
    startChat,
    requestFocus,
    setConfirmation,
    confirmation,
  };
}

describe('suspended human agent card confirmation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts the new request only after confirmation and clears its context', () => {
    const { props, startChat, requestFocus, setConfirmation, confirmation } =
      renderSuspendedCard();
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
    const clearConfirmation =
      setConfirmation.mock.calls[setConfirmation.mock.calls.length - 1][0];
    expect(clearConfirmation(confirmation)).toBeNull();
    act(() => jest.runOnlyPendingTimers());
    expect(requestFocus).toHaveBeenCalledTimes(1);
  });

  it('clears its context on unmount without clearing a newer request', () => {
    const { unmount, setConfirmation, confirmation, startChat } =
      renderSuspendedCard();

    unmount();

    const clearConfirmation =
      setConfirmation.mock.calls[setConfirmation.mock.calls.length - 1][0];
    const newerConfirmation = { ...confirmation };
    expect(clearConfirmation(confirmation)).toBeNull();
    expect(clearConfirmation(newerConfirmation)).toBe(newerConfirmation);
    expect(startChat).not.toHaveBeenCalled();
  });
});
