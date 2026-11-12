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
  BusEventStateChange,
  BusEventType,
  ChatInstance,
  PublicChatState,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  changeView,
  contractChat,
  contractSetup,
  fakeBackend,
  pause,
  recordEvents,
  showUnread,
} from '../../helpers';

/** Opens the main window and waits until loading ends and the input has focus. */
async function openAndLoad(instance: ChatInstance): Promise<void> {
  await changeView(instance, ViewType.MAIN_WINDOW);
  await waitFor(() => {
    const state = instance.state.get();
    expect(state.isHydratingCounter).toBe(0);
    expect(state.status).toBe('ready');
    expect(state.input.focused).toBe(true);
  });
  // A short wait lets any change still on its way land first.
  await pause();
}

/** The values a field takes across a run of states, without repeats. */
function steps<T>(
  states: PublicChatState[],
  read: (state: PublicChatState) => T
): T[] {
  return states
    .map(read)
    .filter((value, index, all) => index === 0 || value !== all[index - 1]);
}

/** The top-level fields one `state:change` changed. */
function changedFields(event: BusEventStateChange): string[] {
  return Object.keys(event.newState).filter(
    (key) =>
      JSON.stringify(event.previousState[key as keyof PublicChatState]) !==
      JSON.stringify(event.newState[key as keyof PublicChatState])
  );
}

/** Records `state:change` events through the public `on`. */
function recordStateChanges(instance: ChatInstance) {
  const recorder = recordEvents(instance, [BusEventType.STATE_CHANGE]);
  return {
    events: () => recorder.of<BusEventStateChange>(BusEventType.STATE_CHANGE),
    clear: () => recorder.clear(),
  };
}

// @covers event.state:change
describe('state:change (deprecated)', () => {
  contractSetup();

  it('fires once per public change, with the previous and new state', async () => {
    const { instance } = await contractChat();
    const changes = recordStateChanges(instance);
    await act(async () => {
      instance.updateIsMessageLoadingCounter('increase');
    });
    const [event, ...rest] = changes.events();
    expect(rest).toEqual([]);
    expect(event.type).toBe(BusEventType.STATE_CHANGE);
    expect(event.previousState.isMessageLoadingCounter).toBe(0);
    expect(event.newState.isMessageLoadingCounter).toBe(1);
  });

  it('gives a newState equal to state.get after the change, and a previousState equal to it before', async () => {
    const { instance } = await contractChat();
    const before = instance.state.get();
    const changes = recordStateChanges(instance);
    await showUnread(instance);
    const [event] = changes.events();
    expect(event.previousState).toEqual(before);
    expect(event.newState).toEqual(instance.state.get());
    expect(event.previousState.showUnreadIndicator).toBe(false);
    expect(event.newState.showUnreadIndicator).toBe(true);
  });

  // The JSDoc names viewState as one of the fields that fire it.
  // @covers instance.state.subscribe state.viewState
  it('fires once for a close and once for a reopen, from the old view to the new one', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    await openAndLoad(instance);
    const changes = recordStateChanges(instance);
    const listener = jest.fn();
    instance.state.subscribe(listener);

    await changeView(instance, ViewType.LAUNCHER);
    // A short wait proves no second notification follows.
    await pause();
    const [closed, ...afterClose] = changes.events();
    expect(afterClose).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(closed.previousState.viewState).toEqual({
      launcher: false,
      mainWindow: true,
    });
    expect(closed.newState.viewState).toEqual({
      launcher: true,
      mainWindow: false,
    });
    changes.clear();
    listener.mockClear();

    await changeView(instance, ViewType.MAIN_WINDOW);
    await pause();
    const [reopened, ...afterReopen] = changes.events();
    expect(afterReopen).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(reopened.previousState.viewState).toEqual({
      launcher: true,
      mainWindow: false,
    });
    expect(reopened.newState.viewState).toEqual({
      launcher: false,
      mainWindow: true,
    });
  });

  // A first open also starts loading, which changes status, the hydrating
  // counter, and messages (the welcome request), and the input takes focus.
  // Each of those is its own notification after the view change's.
  // @covers instance.state.subscribe state.viewState state.status
  // @covers state.isHydratingCounter state.messages state.input.focused
  it('fires first for the view change on a first open, then for each change the loading and the input make', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const changes = recordStateChanges(instance);
    const listener = jest.fn();
    instance.state.subscribe(listener);

    await openAndLoad(instance);
    const events = changes.events();

    const [opened] = events;
    expect(opened.previousState.viewState.mainWindow).toBe(false);
    expect(opened.newState.viewState.mainWindow).toBe(true);
    expect({
      ...opened.newState,
      viewState: opened.previousState.viewState,
    }).toEqual(opened.previousState);

    const values = <T>(read: (state: PublicChatState) => T) =>
      steps([events[0].previousState, ...events.map((e) => e.newState)], read);
    expect(values((state) => state.status)).toEqual([
      'ready',
      'loading',
      'ready',
    ]);
    expect(values((state) => state.isHydratingCounter)).toEqual([0, 1, 0]);
    expect(values((state) => state.input.focused)).toEqual([false, true]);
    expect(
      events[events.length - 1].newState.messages.map(({ id }) => id)
    ).toEqual([backend.requests[0].request.id]);

    expect(new Set(events.flatMap(changedFields))).toEqual(
      new Set([
        'viewState',
        'status',
        'isHydratingCounter',
        'messages',
        'input',
      ])
    );
    expect(listener).toHaveBeenCalledTimes(events.length);
  });

  it('does not fire when no public field changed', async () => {
    const { instance } = await contractChat();
    const changes = recordStateChanges(instance);
    // The indicator is already hidden, so hiding it changes no public field.
    await showUnread(instance, false);
    expect(changes.events()).toEqual([]);
  });

  it('freezes previousState and newState', async () => {
    const { instance } = await contractChat();
    const changes = recordStateChanges(instance);
    await showUnread(instance);
    const [event] = changes.events();
    expect(Object.isFrozen(event.previousState)).toBe(true);
    expect(Object.isFrozen(event.newState)).toBe(true);
    expect(Object.isFrozen(event.newState.viewState)).toBe(true);
  });

  it('lets a handler read the new state through state.get and getState', async () => {
    const { instance } = await contractChat();
    const reads: boolean[] = [];
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: () => {
        reads.push(instance.state.get().showUnreadIndicator);
        reads.push(instance.getState().showUnreadIndicator);
      },
    });
    await showUnread(instance);
    expect(reads).toEqual([true, true]);
  });

  // src/types/instance/PublicChatState.ts:66: input.focused "toggles in the
  // same dispatch pass as the underlying focus event, so subscribing via
  // STATE_CHANGE fires once per focus/blur transition".
  // @covers state.input.focused
  it('fires once per input focus and once per blur', async () => {
    const { instance } = await contractChat();
    const editor = await instance.input.getEditor();
    const changes = recordStateChanges(instance);
    const transitions = () =>
      changes
        .events()
        .map(
          (event) =>
            `${event.previousState.input.focused}->${event.newState.input.focused}`
        );
    await act(async () => {
      editor.commands.focus();
    });
    await waitFor(() => expect(transitions()).toEqual(['false->true']));
    // A short wait proves no second event follows the transition.
    await pause();
    expect(transitions()).toEqual(['false->true']);
    changes.clear();

    await act(async () => {
      editor.commands.blur();
    });
    await waitFor(() => expect(transitions()).toEqual(['true->false']));
    // A short wait proves no second event follows the transition.
    await pause();
    expect(transitions()).toEqual(['true->false']);
  });
});
