/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { type ChatContainerProps } from '../../../aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
  deepActiveElement,
  fakeBackend,
  focusHostButton,
  focusIsInInput,
  pause,
  type ContractMount,
} from '../helpers/contract';

const RETURN_HOME = 'Return to the owned home';
const RETURN_TO_CONVERSATION = 'Return to the owned conversation';

/**
 * As long as `waitFor`'s 1000 ms default, the time the return's focus move
 * would take to land, so a late move into the input shows.
 */
const FOCUS_SETTLED = 1000;

/** Answers every send at once. */
const backend = fakeBackend({ autoResolve: true });

/** An open chat with a home screen, as a host configures it. */
function homeProps(
  shouldTakeFocusIfOpensAutomatically: boolean
): Partial<ChatContainerProps> {
  return {
    openChatByDefault: true,
    shouldTakeFocusIfOpensAutomatically,
    homescreen: { isOn: true, greeting: 'Owned home greeting' },
    strings: {
      homeScreen_returnToHome: RETURN_HOME,
      homeScreen_returnToAssistant: RETURN_TO_CONVERSATION,
    },
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
    },
  };
}

function homeIsOpen(mount: ContractMount): boolean {
  return mount.instance.state.get().homeScreenState.isHomeScreenOpen;
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

/**
 * Goes back to the home screen from the conversation through the header,
 * puts focus on the host page, and presses the home screen's Return to
 * conversation button. Resolves with the host button that had focus.
 */
async function returnFromHome(
  mount: ContractMount
): Promise<HTMLButtonElement> {
  await click(await waitFor(() => byRole('button', RETURN_HOME)));
  await waitFor(() => expect(homeIsOpen(mount)).toBe(true));
  const back = await waitFor(() => byRole('button', RETURN_TO_CONVERSATION));
  const button = await focusHostAfterChatSettles();
  await click(back);
  await waitFor(() => expect(homeIsOpen(mount)).toBe(false));
  return button;
}

/** Sends a message, which leaves the home screen for the conversation. */
async function leaveHome(mount: ContractMount): Promise<void> {
  await act(() => mount.instance.messaging.send('Owned question'));
  await waitFor(() => expect(homeIsOpen(mount)).toBe(false));
}

describe('public home screen return focus', () => {
  contractSetup();

  it('moves focus into the input when the user returns to the conversation, and leaves it alone after', async () => {
    const mount = await contractChat(homeProps(true));
    try {
      await leaveHome(mount);
      await returnFromHome(mount);
      await waitFor(() => expect(focusIsInInput()).toBe(true));

      // One move: focus the host puts elsewhere afterwards stays there.
      const later = await focusHostAfterChatSettles();
      await pause(FOCUS_SETTLED);
      expect(deepActiveElement()).toBe(later);
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('leaves host focus alone on the return while shouldTakeFocusIfOpensAutomatically is false, and moves it once the host turns it on', async () => {
    const mount = await contractChat(homeProps(false));
    try {
      await leaveHome(mount);
      const button = await returnFromHome(mount);
      await pause(FOCUS_SETTLED);
      expect(deepActiveElement()).toBe(button);
      expect(focusIsInInput()).toBe(false);

      // Positive control: the same return moves focus once the flag is on.
      await mount.rerender(homeProps(true));
      await returnFromHome(mount);
      await waitFor(() => expect(focusIsInInput()).toBe(true));
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
