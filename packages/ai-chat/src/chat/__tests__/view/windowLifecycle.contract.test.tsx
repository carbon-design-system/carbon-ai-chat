/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import {
  ChatContainer,
  ViewType,
  type ChatInstance,
} from '../../../aiChatEntry';
import {
  changeView,
  contractChat,
  contractSetup,
  deepActiveElement,
  deferred,
  focusHostButton,
  focusIsInInput,
  pause,
} from '../helpers/contract';

/** A first chat boot's wait, the repo convention. */
const BOOT = { timeout: 5000 };

/**
 * jsdom never ends a close animation, so the chat finishes a close on its
 * own fallback. Waiting this long lets a close settle completely.
 */
const CLOSE_SETTLED = 600;

/**
 * As long as `waitFor`'s 1000 ms default, the time a reveal's focus move
 * would take to land, so a late move into the input shows.
 */
const REVEAL_SETTLED = 1000;

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

describe('public host window lifecycle', () => {
  contractSetup();

  it('moves focus into the input on a first open, on a reopen before the close settles, and on a reopen after it', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    focusHostButton();
    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(focusIsInInput()).toBe(true));

    // A close requests focus itself. Positive control: that request has
    // landed and the host button holds focus before the reopen, still well
    // inside the close.
    await changeView(instance, ViewType.LAUNCHER);
    await focusHostAfterChatSettles();
    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(focusIsInInput()).toBe(true));
    expect(instance.getState().viewState.mainWindow).toBe(true);

    await changeView(instance, ViewType.LAUNCHER);
    await pause(CLOSE_SETTLED);
    await focusHostAfterChatSettles();
    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(focusIsInInput()).toBe(true));
    expect(instance.getState().viewState.mainWindow).toBe(true);
  });

  it('keeps host focus when a host Suspense boundary hides and then reveals the open chat, and moves focus on a reopen after it', async () => {
    const sibling = deferred<{ default: React.ComponentType }>();
    const Sibling = React.lazy(() => sibling.promise);
    let instance: ChatInstance | undefined;
    let after = 0;
    function Page({ suspended }: { suspended: boolean }) {
      return (
        <React.Suspense fallback={<p>Host page loading</p>}>
          <ChatContainer
            openChatByDefault
            messaging={{ skipWelcome: true }}
            onBeforeRender={(handed: ChatInstance) => {
              instance = handed;
            }}
            onAfterRender={() => {
              after += 1;
            }}
          />
          {suspended ? <Sibling /> : null}
        </React.Suspense>
      );
    }
    let view: ReturnType<typeof render>;
    await act(async () => {
      view = render(<Page suspended={false} />);
    });
    try {
      await waitFor(() => expect(after).toBe(1), BOOT);
      // Positive control: the first open's own hydration focus.
      await waitFor(() => expect(focusIsInInput()).toBe(true));
      const button = focusHostButton();
      // A plain update, not a transition, so the boundary shows its fallback
      // and hides the chat it already showed, keeping the same mount.
      await act(async () => {
        view.rerender(<Page suspended />);
      });
      await waitFor(() =>
        expect(document.body.textContent).toContain('Host page loading')
      );
      await pause(50);
      expect(deepActiveElement()).toBe(button);
      await act(async () => {
        sibling.resolve({ default: () => <p>Host page loaded</p> });
      });
      await waitFor(() =>
        expect(document.body.textContent).toContain('Host page loaded')
      );
      // A reveal is not a reopen: the chat leaves focus where the host put it.
      await pause(REVEAL_SETTLED);
      expect(deepActiveElement()).toBe(button);
      // The same mount came back: no second boot.
      expect(after).toBe(1);
      expect(instance.getState().viewState.mainWindow).toBe(true);

      // Positive control: the revealed chat still moves focus on a reopen.
      await changeView(instance, ViewType.LAUNCHER);
      await pause(CLOSE_SETTLED);
      await focusHostAfterChatSettles();
      await changeView(instance, ViewType.MAIN_WINDOW);
      await waitFor(() => expect(focusIsInInput()).toBe(true));
      expect(after).toBe(1);
    } finally {
      await act(async () => view.unmount());
    }
  });
});
