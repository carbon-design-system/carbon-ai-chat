/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * These tests find the panel by its dialog role and the name the test sets
 * through `strings`, and its retry button by role and name (plan D4.2). One
 * test checks the panel's public test ID.
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventType,
  CatastrophicErrorPanelState,
  ChatInstance,
  PageObjectId,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  byRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  isShownWithin,
  recordEvents,
  responseOf,
  shownText,
  textItem,
} from '../../helpers';

const STRINGS = {
  aria_catastrophicErrorPanel: 'Contract error panel',
  buttons_retry: 'Contract retry',
  errors_somethingWrong: 'Contract went wrong',
  errors_communicating: '{assistantName} is down for the contract',
};

/** How many error panels show: 0 or 1. */
const panelCount = () =>
  allByRole('dialog', STRINGS.aria_catastrophicErrorPanel).length;

/** The one error panel that shows. */
const panel = () => byRole('dialog', STRINGS.aria_catastrophicErrorPanel);

/** The text the error panel shows, with white space collapsed. */
const panelText = () => shownText(panel()).replace(/\s+/g, ' ').trim();

/** How many retry buttons show: 0 or 1. */
const retryCount = () => allByRole('button', STRINGS.buttons_retry).length;

/** Mounts a chat with the test strings, and opens the main window. */
async function openChat(
  config: Partial<PublicConfig> = {}
): Promise<ChatInstance> {
  const { instance } = await contractChat({
    ...config,
    strings: STRINGS,
    messaging: { skipWelcome: true, ...config.messaging },
  });
  await changeView(instance, ViewType.MAIN_WINDOW);
  return instance;
}

/** Calls `updateCatastrophicErrorPanel` the way a host would. */
async function update(
  instance: ChatInstance,
  panelState: CatastrophicErrorPanelState
): Promise<void> {
  await act(async () => {
    instance.updateCatastrophicErrorPanel(panelState);
  });
}

// @covers instance.updateCatastrophicErrorPanel config.strings
describe('updateCatastrophicErrorPanel', () => {
  contractSetup();

  it('shows a dialog named from strings, with the title and the markdown body the call gives', async () => {
    const instance = await openChat();
    expect(panelCount()).toBe(0);
    await update(instance, {
      isOpen: true,
      title: 'Contract title',
      bodyText: 'Contract **body**',
    });
    await waitFor(() =>
      expect(panelText()).toContain('Contract title Contract body')
    );
    expect(panelText()).not.toContain('**');
  });

  // @covers export.aiChatEntry.PageObjectId
  it('shows the dialog inside the catastrophic panel test ID', async () => {
    const instance = await openChat();
    await update(instance, { isOpen: true });
    await waitFor(() => expect(panelCount()).toBe(1));
    expect(
      isShownWithin(panel(), getByTestId(PageObjectId.CATASTROPHIC_PANEL))
    ).toBe(true);
  });

  // @covers config.assistantName
  it('shows the title and body from strings when the call gives neither', async () => {
    const instance = await openChat({ assistantName: 'Contract bot' });
    await update(instance, { isOpen: true });
    await waitFor(() =>
      expect(panelText()).toContain(
        'Contract went wrong Contract bot is down for the contract'
      )
    );
  });

  it('hides the dialog again on isOpen false', async () => {
    const instance = await openChat();
    await update(instance, { isOpen: true });
    await waitFor(() => expect(panelCount()).toBe(1));
    await update(instance, { isOpen: false });
    await waitFor(() => expect(panelCount()).toBe(0));
  });

  it('fires no event and changes no public state as it opens and closes', async () => {
    const instance = await openChat();
    const before = instance.getState();
    const events = recordEvents(instance);
    await update(instance, { isOpen: true, title: 'Contract title' });
    await waitFor(() => expect(panelCount()).toBe(1));
    await update(instance, { isOpen: false });
    await waitFor(() => expect(panelCount()).toBe(0));
    // MAIN-NOTES M51: its JSDoc says the call fires an event; no host event fires.
    expect(events.types()).toEqual([]);
    expect(instance.getState()).toEqual(before);
  });

  it('keeps the last title and body when a later call opens it without them', async () => {
    const instance = await openChat();
    await update(instance, {
      isOpen: true,
      title: 'Contract first title',
      bodyText: 'Contract first body',
    });
    await waitFor(() =>
      expect(panelText()).toContain('Contract first title Contract first body')
    );
    await update(instance, { isOpen: false });
    await waitFor(() => expect(panelCount()).toBe(0));
    await update(instance, { isOpen: true });
    await waitFor(() => expect(panelCount()).toBe(1));
    // MAIN-NOTES M50: each call merges into the last one, so the defaults
    // from strings don't come back.
    expect(panelText()).toContain('Contract first title Contract first body');
    expect(panelText()).not.toContain(STRINGS.errors_somethingWrong);
  });

  it('shows a retry button inside the dialog, and none with hideRetryButton', async () => {
    const instance = await openChat();
    await update(instance, { isOpen: true });
    await waitFor(() => expect(retryCount()).toBe(1));
    expect(
      isShownWithin(byRole('button', STRINGS.buttons_retry), panel())
    ).toBe(true);
    await update(instance, { isOpen: true, hideRetryButton: true });
    await waitFor(() => expect(retryCount()).toBe(0));
    expect(panelCount()).toBe(1);
  });
});

// @covers instance.updateCatastrophicErrorPanel instance.messaging.restartConversation
// @covers event.pre:restartConversation event.restartConversation state.messages
describe('the error panel’s retry button', () => {
  contractSetup();

  it('restarts the conversation, which clears the messages and closes the dialog', async () => {
    const instance = await openChat();
    await act(() =>
      instance.messaging.addMessage(responseOf('r1', [textItem('Before')]))
    );
    await update(instance, { isOpen: true });
    await waitFor(() => expect(retryCount()).toBe(1));
    const events = recordEvents(instance, [
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.RESTART_CONVERSATION,
    ]);
    await click(byRole('button', STRINGS.buttons_retry));
    await waitFor(() =>
      expect(events.types()).toEqual([
        'pre:restartConversation',
        'restartConversation',
      ])
    );
    expect(instance.getState().messages).toEqual([]);
    await waitFor(() => expect(panelCount()).toBe(0));
  });

  it('closes the dialog when the host restarts the conversation', async () => {
    const instance = await openChat();
    await update(instance, { isOpen: true, hideRetryButton: true });
    await waitFor(() => expect(panelCount()).toBe(1));
    await act(() => instance.messaging.restartConversation());
    await waitFor(() => expect(panelCount()).toBe(0));
  });
});
