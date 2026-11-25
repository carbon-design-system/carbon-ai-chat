// @vitest-environment jsdom
// happy-dom 21 does not retarget event.target out of shadow roots, which the chat's React handlers need.
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
  MessageResponseTypes,
  type ChatInstance,
  type GenericItem,
} from '../../../aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
  deepActiveElement,
  fakeBackend,
  fakeDesk,
  focusHostButton,
  focusIsInInput,
  isShownWithin,
  pause,
  responseOf,
} from '../helpers/contract';

const CANCEL_REQUEST = 'Cancel the owned agent request';

/** Adds an assistant reply that offers one option. */
async function addOption(
  instance: ChatInstance,
  id: string,
  label: string
): Promise<void> {
  await act(() =>
    instance.messaging.addMessage(
      responseOf(id, [
        {
          response_type: MessageResponseTypes.OPTION,
          options: [{ label, value: { input: { text: label } } }],
        } as GenericItem,
      ])
    )
  );
}

/**
 * Moves focus to a new host button once focus work the chat already started
 * has landed, and checks it stays there until the test acts.
 */
async function focusHostAfterChatSettles(): Promise<HTMLButtonElement> {
  await pause(50);
  const button = focusHostButton();
  await pause(50);
  expect(deepActiveElement()).toBe(button);
  return button;
}

describe('public agent banner focus', () => {
  contractSetup();

  it('returns focus to the input after an option, and to the agent banner instead while an agent request disables the input', async () => {
    const desk = fakeDesk();
    const mount = await contractChat({
      openChatByDefault: true,
      serviceDeskFactory: desk.factory,
      strings: { agent_connectButtonCancel: CANCEL_REQUEST },
      messaging: {
        skipWelcome: true,
        customSendMessage: fakeBackend({ autoResolve: true }).customSendMessage,
      },
    });
    const { instance } = mount;
    let started = false;
    try {
      // Positive control: with no agent, choosing an option focuses the input.
      await addOption(instance, 'first-options', 'Owned first choice');
      const first = await waitFor(() => byRole('button', 'Owned first choice'));
      await focusHostAfterChatSettles();
      await click(first);
      await waitFor(() => expect(focusIsInInput()).toBe(true));

      // An agent request that hasn't connected yet disables the input.
      started = true;
      await act(() => instance.serviceDesk.startConversation());
      expect(instance.state.get().humanAgent.isConnecting).toBe(true);
      const cancel = await waitFor(() => byRole('button', CANCEL_REQUEST));
      await addOption(instance, 'second-options', 'Owned second choice');
      const second = await waitFor(() =>
        byRole('button', 'Owned second choice')
      );
      await focusHostAfterChatSettles();
      await click(second);
      await waitFor(() =>
        expect(isShownWithin(deepActiveElement(), cancel)).toBe(true)
      );
      expect(focusIsInInput()).toBe(false);
    } finally {
      try {
        if (started) {
          await act(() => instance.serviceDesk.endConversation());
        }
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
