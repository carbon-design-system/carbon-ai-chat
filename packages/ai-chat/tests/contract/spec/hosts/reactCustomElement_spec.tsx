/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `ChatCustomElement`'s own props: the element it renders the chat into
 * takes the host's `className` and `id`. The props it shares with
 * `ChatContainer` run through both React hosts in `reactContainer_spec.tsx`.
 */

import { act, waitFor } from '@testing-library/react';

import { PageObjectId } from '../../../../src/aiChatEntry';
import {
  contractCustomElementChat,
  contractSetup,
  countChatReady,
  getByTestId,
  isShownWithin,
  mainPanelText,
  pause,
  recordEvents,
  textResponse,
} from '../../helpers';

/** A chat that opens at mount and sends no welcome request. */
const OPEN = {
  openChatByDefault: true,
  messaging: { skipWelcome: true },
};

// @covers react.ChatCustomElement.className react.ChatCustomElement.id
describe('ChatCustomElement className and id', () => {
  contractSetup();

  it('renders the chat inside an element with the host’s class and id', async () => {
    await contractCustomElementChat({
      ...OPEN,
      className: 'host-chat-class',
      id: 'host-chat',
    });
    const element = document.getElementById('host-chat');
    expect(element).not.toBeNull();
    expect(element.classList.contains('host-chat-class')).toBe(true);
    expect(isShownWithin(getByTestId(PageObjectId.MAIN_PANEL), element)).toBe(
      true
    );
    expect(
      Array.from(document.getElementsByClassName('host-chat-class'))
    ).toEqual([element]);
  });

  it('gives the element no id when the host passes none', async () => {
    await contractCustomElementChat({ ...OPEN, className: 'host-chat-class' });
    const [element] = Array.from(
      document.getElementsByClassName('host-chat-class')
    );
    expect(element.hasAttribute('id')).toBe(false);
    expect(isShownWithin(getByTestId(PageObjectId.MAIN_PANEL), element)).toBe(
      true
    );
  });

  it('moves the same chat to the new class and id when the host rerenders with them', async () => {
    const ready = countChatReady();
    const onBeforeRender = jest.fn(ready.onBeforeRender);
    const onAfterRender = jest.fn();
    const props = (className: string, id: string) => ({
      ...OPEN,
      className,
      id,
      onBeforeRender,
      onAfterRender,
    });
    const chat = await contractCustomElementChat(props('class-one', 'id-one'));
    await waitFor(() => expect(ready.count()).toBe(1));
    await act(() =>
      chat.instance.messaging.addMessage(textResponse('Kept reply', 'r1'))
    );
    const events = recordEvents(chat.instance);

    await chat.rerender(props('class-two', 'id-two'));
    const element = document.getElementById('id-two');
    expect(element).not.toBeNull();
    expect(element.classList.contains('class-two')).toBe(true);
    expect(element.classList.contains('class-one')).toBe(false);
    expect(document.getElementById('id-one')).toBeNull();
    expect(isShownWithin(getByTestId(PageObjectId.MAIN_PANEL), element)).toBe(
      true
    );
    // A short wait to show the chat doesn't start again.
    await pause();
    expect(onBeforeRender).toHaveBeenCalledTimes(1);
    expect(onAfterRender).toHaveBeenCalledTimes(1);
    expect(ready.count()).toBe(1);
    expect(events.types()).toEqual([]);
    expect(mainPanelText()).toContain('Kept reply');
  });
});
