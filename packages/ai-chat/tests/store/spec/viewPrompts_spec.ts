/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  answerPrompt,
  closePrompt,
  openPrompt,
  viewActions,
} from '../../../src/chat/state';
import { createMountViewState } from '../../../src/chat/state/initialState';
import { makeConfigStore } from '../../test_helpers';

function setup() {
  const store = makeConfigStore({});
  const shown = () => store.getState().view.prompt;
  const listener = jest.fn();
  store.subscribe(listener);
  return { store, shown, listener };
}

function answers() {
  return { onConfirm: jest.fn(), onCancel: jest.fn() };
}

it('starts with no prompt', () => {
  expect(setup().shown()).toBeNull();
});

it('shows the question in state and keeps its answers out of it', () => {
  const { store, shown } = setup();
  const card = answers();

  openPrompt(store, { kind: 'humanAgent', title: 'T', message: 'M' }, card);

  expect(shown()).toEqual({
    id: expect.any(String),
    kind: 'humanAgent',
    title: 'T',
    message: 'M',
  });
  expect(JSON.parse(JSON.stringify(shown()))).toEqual(shown());
});

it('runs the chosen answer once, after the prompt closes', () => {
  const { store, shown } = setup();
  const card = answers();
  card.onConfirm.mockImplementation(() => {
    expect(shown()).toBeNull();
  });
  openPrompt(store, { kind: 'humanAgent' }, card);
  const { id } = shown();

  answerPrompt(store, id, 'confirm');
  answerPrompt(store, id, 'confirm');
  answerPrompt(store, id, 'cancel');

  expect(card.onConfirm).toHaveBeenCalledTimes(1);
  expect(card.onCancel).not.toHaveBeenCalled();
  expect(shown()).toBeNull();
});

it('runs the cancel answer, and a prompt with none just closes', () => {
  const { store, shown } = setup();
  const card = answers();
  openPrompt(store, { kind: 'humanAgent' }, card);
  answerPrompt(store, shown().id, 'cancel');
  expect(card.onCancel).toHaveBeenCalledTimes(1);

  const endChat = jest.fn();
  openPrompt(store, { kind: 'endChat' }, { onConfirm: endChat });
  answerPrompt(store, shown().id, 'cancel');
  expect(endChat).not.toHaveBeenCalled();
  expect(shown()).toBeNull();
});

it('lets an older card release leave a newer card open', () => {
  const { store, shown } = setup();
  const first = answers();
  const second = answers();

  const releaseFirst = openPrompt(
    store,
    { kind: 'humanAgent', title: 'First' },
    first
  );
  const releaseSecond = openPrompt(
    store,
    { kind: 'humanAgent', title: 'Second' },
    second
  );
  releaseFirst();

  expect(shown().title).toBe('Second');
  // The replaced card's answers are gone with it.
  answerPrompt(store, shown().id, 'confirm');
  expect(first.onConfirm).not.toHaveBeenCalled();
  expect(second.onConfirm).toHaveBeenCalledTimes(1);
  releaseSecond();
  expect(shown()).toBeNull();
});

it("shows a card's prompt over the end-chat prompt, and the end-chat prompt after it", () => {
  const { store, shown } = setup();
  const endChat = jest.fn();
  openPrompt(store, { kind: 'endChat' }, { onConfirm: endChat });
  const endChatPrompt = shown();

  const release = openPrompt(
    store,
    { kind: 'humanAgent', title: 'Card' },
    answers()
  );
  expect(shown().title).toBe('Card');
  // Opening the end-chat prompt again keeps the card's on top.
  openPrompt(store, { kind: 'endChat' }, { onConfirm: endChat });
  expect(shown().title).toBe('Card');

  release();
  expect(shown()).toBe(endChatPrompt);
  answerPrompt(store, endChatPrompt.id, 'confirm');
  expect(endChat).toHaveBeenCalledTimes(1);
  expect(shown()).toBeNull();
});

it('keeps an open end-chat prompt when it opens again', () => {
  const { store, shown, listener } = setup();
  const first = jest.fn();
  const second = jest.fn();
  openPrompt(store, { kind: 'endChat' }, { onConfirm: first });
  const open = shown();
  listener.mockClear();

  openPrompt(store, { kind: 'endChat' }, { onConfirm: second });

  expect(shown()).toBe(open);
  expect(listener).not.toHaveBeenCalled();
  answerPrompt(store, open.id, 'confirm');
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).not.toHaveBeenCalled();
});

it('does nothing when closing a prompt that is already closed', () => {
  const { store, shown, listener } = setup();
  const release = openPrompt(store, { kind: 'humanAgent' }, answers());
  const { id } = shown();
  release();
  listener.mockClear();

  release();
  closePrompt(store, id);
  closePrompt(store, 'not-a-prompt');

  expect(listener).not.toHaveBeenCalled();
});

it('keeps prompts apart for two chats', () => {
  const first = setup();
  const second = setup();
  const card = answers();
  openPrompt(first.store, { kind: 'humanAgent' }, card);

  expect(second.shown()).toBeNull();
  answerPrompt(second.store, first.shown().id, 'confirm');
  expect(card.onConfirm).not.toHaveBeenCalled();
  expect(first.shown()).not.toBeNull();
});

it('keeps an open prompt when a reused chat starts a new mount', () => {
  const { store, shown } = setup();
  const card = answers();
  openPrompt(store, { kind: 'humanAgent' }, card);
  const open = shown();

  store.dispatch(viewActions.startNewMount(createMountViewState({})));

  expect(shown()).toBe(open);
  answerPrompt(store, open.id, 'confirm');
  expect(card.onConfirm).toHaveBeenCalledTimes(1);
});

it('leaves the prompt out of saved state', () => {
  const { store } = setup();
  openPrompt(store, { kind: 'humanAgent' }, answers());
  expect(store.getState().view.persistedToBrowserStorage).not.toHaveProperty(
    'prompt'
  );
});
