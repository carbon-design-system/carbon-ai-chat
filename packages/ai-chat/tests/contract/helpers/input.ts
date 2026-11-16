/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The chat's input field, the way a host or user reaches it: an open chat to
 * type into, the field found by its public test ID, and typing.
 */

import { act, waitFor } from '@testing-library/react';

import {
  ChatInstance,
  PageObjectId,
  PublicConfig,
  ViewType,
} from '../../../src/aiChatEntry';
import { changeView } from './actions';
import { FakeBackend, fakeBackend } from './backend';
import { getByTestId } from './dom';
import { contractChat } from './mount';

/**
 * Waits for the browser's next animation frames to run, inside `act`.
 */
async function nextFrames(count: number): Promise<void> {
  for (let frame = 0; frame < count; frame++) {
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
  }
}

/**
 * Mounts a chat with this config, opens its main window with no welcome
 * request, and waits until it is no longer loading. Each send is answered at
 * once by the returned backend, unless `config.messaging` brings its own
 * `customSendMessage`.
 *
 * Once it has loaded, the chat moves focus to its input on the next animation
 * frame. This waits out that frame, plus one more in case the chat schedules it
 * a render late, so the chat's own startup focus can't land in the middle of a
 * test and undo what the test focused, such as an open menu.
 */
export async function openChat(config: Partial<PublicConfig> = {}): Promise<{
  instance: ChatInstance;
  backend: FakeBackend;
}> {
  const backend = fakeBackend({ autoResolve: true });
  const { instance } = await contractChat({
    ...config,
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
      ...config.messaging,
    },
  });
  await changeView(instance, ViewType.MAIN_WINDOW);
  await waitFor(() => expect(instance.state.get().status).not.toBe('loading'));
  await nextFrames(2);
  return { instance, backend };
}

/** The input field, found by its public test ID. */
export function inputField(): HTMLTextAreaElement {
  return getByTestId(PageObjectId.INPUT) as HTMLTextAreaElement;
}

/**
 * Types into the plain input field the way a browser reports it: a new value,
 * then an `input` event. Works only while the field is the plain one (no rich
 * input feature configured and no `getEditor` call yet).
 */
export async function typeText(text: string): Promise<void> {
  await act(async () => {
    inputField().value = text;
    inputField().dispatchEvent(new Event('input', { bubbles: true }));
  });
}
