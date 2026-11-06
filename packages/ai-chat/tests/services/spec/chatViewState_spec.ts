/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatViewState } from '../../../src/chat/services/chatViewState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { createIntl } from '../../../src/chat/utils/i18n';
import { setIntl } from '../../../src/chat/utils/intlUtils';
import type { LanguagePack } from '../../../src/types/config/LanguagePack';

const mockAnnounce = jest.fn();

jest.mock(
  '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js',
  () => ({
    mountAriaAnnouncer: () => ({
      announce: mockAnnounce,
      disconnect: jest.fn(),
    }),
  })
);

function createManager() {
  return {
    store: { getState: () => ({}), subscribe: () => () => {} },
    intl: createIntl({ locale: 'en', messages: { greeting: 'Hello' } }),
  } as unknown as ServiceManager;
}

function createViewState(manager = createManager()) {
  return new ChatViewState(manager, { width: 800, height: 600 });
}

function confirmation(title: string) {
  return { title, onConfirm: jest.fn(), onCancel: jest.fn() };
}

const frenchPack = { greeting: 'Bonjour' } as unknown as LanguagePack;

beforeEach(() => mockAnnounce.mockClear());

it('gives a plain caller every field for its chat without React', () => {
  const manager = createManager();
  const viewState = createViewState(manager);
  const card = confirmation('Card');

  viewState.showEndChatConfirmation();
  viewState.openConfirmation(card);

  const snapshot = viewState.getSnapshot();
  expect(snapshot.serviceManager).toBe(manager);
  expect(snapshot.intl).toBe(manager.intl);
  expect(snapshot.windowSize).toEqual({ width: 800, height: 600 });
  expect(snapshot.endChatConfirmationOpen).toBe(true);
  expect(snapshot.humanAgentConfirmation).toBe(card);
  expect(Object.isFrozen(snapshot)).toBe(true);
});

it('keeps the snapshot object until a field changes', () => {
  const viewState = createViewState();
  const listener = jest.fn();
  viewState.subscribe(listener);
  const before = viewState.getSnapshot();

  viewState.setWindowSize({ width: 800, height: 600 });
  viewState.hideEndChatConfirmation();

  expect(viewState.getSnapshot()).toBe(before);
  expect(listener).not.toHaveBeenCalled();

  viewState.setWindowSize({ width: 400, height: 600 });
  expect(viewState.getSnapshot()).not.toBe(before);
  expect(listener).toHaveBeenCalledTimes(1);
});

it('notifies a select listener only when its selected value changes', () => {
  const viewState = createViewState();
  const onWidth = jest.fn();
  viewState.select((snapshot) => snapshot.windowSize.width, onWidth);

  viewState.showEndChatConfirmation();
  viewState.setWindowSize({ width: 800, height: 300 });
  expect(onWidth).not.toHaveBeenCalled();

  viewState.setWindowSize({ width: 500, height: 300 });
  expect(onWidth).toHaveBeenCalledTimes(1);
  expect(onWidth).toHaveBeenCalledWith(500);
});

it('lets an older confirmation release leave a newer one open', () => {
  const viewState = createViewState();
  const first = confirmation('First');
  const second = confirmation('Second');

  const releaseFirst = viewState.openConfirmation(first);
  const releaseSecond = viewState.openConfirmation(second);
  releaseFirst();

  expect(viewState.getSnapshot().humanAgentConfirmation).toBe(second);
  releaseSecond();
  expect(viewState.getSnapshot().humanAgentConfirmation).toBeNull();
});

it('follows formatter changes only while connected', () => {
  const manager = createManager();
  const viewState = createViewState(manager);
  const onIntl = jest.fn();
  viewState.select((snapshot) => snapshot.intl, onIntl);

  setIntl(manager, 'fr', frenchPack);
  expect(onIntl).not.toHaveBeenCalled();

  viewState.connect();
  viewState.connect();
  expect(viewState.getSnapshot().intl).toBe(manager.intl);
  expect(onIntl).toHaveBeenCalledTimes(1);

  setIntl(manager, 'en', frenchPack);
  expect(onIntl).toHaveBeenCalledTimes(2);

  viewState.disconnect();
  viewState.disconnect();
  setIntl(manager, 'de', frenchPack);
  expect(onIntl).toHaveBeenCalledTimes(2);
});

it('announces with the formatter from the latest change', async () => {
  const manager = createManager();
  const viewState = createViewState(manager);
  viewState.connect();
  viewState.announcer.connect(document.createElement('div'));

  setIntl(manager, 'fr', frenchPack);
  viewState.announcer.announce({ messageID: 'greeting' as keyof LanguagePack });
  // The polite queue flushes after a microtask and an await of its markdown.
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(mockAnnounce).toHaveBeenCalledWith('Bonjour', 'polite');
  viewState.announcer.disconnect();
});

it('waits for every retained React commit without notifying view subscribers', async () => {
  const state = createViewState();
  const changed = jest.fn();
  state.subscribe(changed);
  const first = state.holdInitialReactCommit();
  const second = state.holdInitialReactCommit();
  const committed = jest.fn();
  state.whenInitialReactCommitReady(committed);
  first();
  first();
  await Promise.resolve();
  expect(committed).not.toHaveBeenCalled();
  second();
  await Promise.resolve();
  expect(committed).toHaveBeenCalledTimes(1);
  expect(changed).not.toHaveBeenCalled();
});

it('rechecks a hold acquired during effect replay before acknowledging a commit', async () => {
  const state = createViewState();
  const retired = jest.fn();
  const first = state.holdInitialReactCommit();
  const cancel = state.whenInitialReactCommitReady(retired);
  first();
  cancel();
  const second = state.holdInitialReactCommit();
  const committed = jest.fn();
  state.whenInitialReactCommitReady(committed);
  first();
  await Promise.resolve();
  expect(retired).not.toHaveBeenCalled();
  expect(committed).not.toHaveBeenCalled();
  second();
  await Promise.resolve();
  expect(committed).toHaveBeenCalledTimes(1);
});

it('drops queued callbacks and stale holds when a mount disconnects', async () => {
  const state = createViewState();
  const first = state.holdInitialReactCommit();
  const retired = jest.fn();
  state.whenInitialReactCommitReady(retired);
  state.disconnect();
  const second = state.holdInitialReactCommit();
  const current = jest.fn();
  state.whenInitialReactCommitReady(current);
  first();
  await Promise.resolve();
  expect(retired).not.toHaveBeenCalled();
  expect(current).not.toHaveBeenCalled();
  second();
  await Promise.resolve();
  expect(current).toHaveBeenCalledTimes(1);
});
