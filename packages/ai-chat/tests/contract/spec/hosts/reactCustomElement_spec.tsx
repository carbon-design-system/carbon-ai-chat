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
 * takes the host's `className` and `id`, and, with no `onViewChange`, hides
 * while the chat is closed. The props it shares with `ChatContainer` run
 * through both React hosts in `reactContainer_spec.tsx`.
 */

import { act, waitFor } from '@testing-library/react';

import { PageObjectId, ViewType } from '../../../../src/aiChatEntry';
import {
  changeView,
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
    const { wrapper } = await contractCustomElementChat({
      ...OPEN,
      className: 'host-chat-class',
      id: 'host-chat',
    });
    expect(wrapper.id).toBe('host-chat');
    expect(wrapper.classList.contains('host-chat-class')).toBe(true);
    expect(isShownWithin(getByTestId(PageObjectId.MAIN_PANEL), wrapper)).toBe(
      true
    );
    expect(
      Array.from(document.getElementsByClassName('host-chat-class'))
    ).toEqual([wrapper]);
  });

  it('gives the element no id when the host passes none', async () => {
    const { wrapper } = await contractCustomElementChat({
      ...OPEN,
      className: 'host-chat-class',
    });
    expect(wrapper.hasAttribute('id')).toBe(false);
    expect(isShownWithin(getByTestId(PageObjectId.MAIN_PANEL), wrapper)).toBe(
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
    expect(chat.wrapper.id).toBe('id-two');
    expect(chat.wrapper.classList.contains('class-two')).toBe(true);
    expect(chat.wrapper.classList.contains('class-one')).toBe(false);
    expect(document.getElementById('id-one')).toBeNull();
    expect(
      isShownWithin(getByTestId(PageObjectId.MAIN_PANEL), chat.wrapper)
    ).toBe(true);
    // A short wait to show the chat doesn't start again.
    await pause();
    expect(onBeforeRender).toHaveBeenCalledTimes(1);
    expect(onAfterRender).toHaveBeenCalledTimes(1);
    expect(ready.count()).toBe(1);
    expect(events.types()).toEqual([]);
    expect(mainPanelText()).toContain('Kept reply');
  });
});

/** The class `ChatCustomElement`'s JSDoc names for its closed element. */
const HIDDEN = 'cds-aichat--hidden';

/** A chat that starts closed and sends no welcome request. */
const CLOSED = { messaging: { skipWelcome: true } };

// @covers react.ChatCustomElement.className
describe('ChatCustomElement hiding its element', () => {
  contractSetup();

  it('marks its element cds-aichat--hidden while the chat is closed, and not while it is open', async () => {
    const { instance, wrapper } = await contractCustomElementChat(CLOSED);
    await waitFor(() => expect(wrapper.classList.contains(HIDDEN)).toBe(true));
    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(wrapper.classList.contains(HIDDEN)).toBe(false));
    await changeView(instance, ViewType.LAUNCHER);
    await waitFor(() => expect(wrapper.classList.contains(HIDDEN)).toBe(true));
  });

  it('leaves the class off when the host passes its own onViewChange', async () => {
    const onViewChange = jest.fn();
    const { instance, wrapper } = await contractCustomElementChat({
      ...CLOSED,
      onViewChange,
    });
    await waitFor(() => expect(onViewChange).toHaveBeenCalled());
    expect(wrapper.classList.contains(HIDDEN)).toBe(false);
    const calls = onViewChange.mock.calls.length;
    await changeView(instance, ViewType.MAIN_WINDOW);
    await changeView(instance, ViewType.LAUNCHER);
    await waitFor(() => expect(onViewChange).toHaveBeenCalledTimes(calls + 2));
    expect(wrapper.classList.contains(HIDDEN)).toBe(false);
  });

  // MAIN-NOTES M99 (U53): the default handler adds the class through
  // `classList`, so a rerender with a new `className` resets the class
  // attribute and drops it while the chat is still closed.
  it('drops the class when the host rerenders a closed chat with a new className', async () => {
    const chat = await contractCustomElementChat({
      ...CLOSED,
      className: 'class-one',
    });
    await waitFor(() =>
      expect(chat.wrapper.classList.contains(HIDDEN)).toBe(true)
    );
    await chat.rerender({ ...CLOSED, className: 'class-two' });
    expect(chat.instance.getState().viewState.mainWindow).toBe(false);
    expect(Array.from(chat.wrapper.classList)).toEqual(['class-two']);
  });
});
