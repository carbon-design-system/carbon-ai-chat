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
  ViewType,
} from '../../../../src/aiChatEntry';
import { contractChat, contractSetup, recordEvents } from '../../helpers';

/** Records `state:change` events through the public `on`. */
function recordStateChanges(instance: ChatInstance) {
  const recorder = recordEvents(instance, [BusEventType.STATE_CHANGE]);
  return {
    events: () => recorder.of<BusEventStateChange>(BusEventType.STATE_CHANGE),
    clear: () => recorder.clear(),
  };
}

/** A public change that touches no messaging field: the unread indicator. */
function showUnread(instance: ChatInstance, isVisible = true): void {
  act(() => instance.updateAssistantUnreadIndicatorVisibility(isVisible));
}

// @covers event.state:change
describe('state:change (deprecated)', () => {
  contractSetup();

  it('fires once per public change, with the previous and new state', async () => {
    const { instance } = await contractChat();
    const changes = recordStateChanges(instance);
    act(() => instance.updateIsMessageLoadingCounter('increase'));
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
    showUnread(instance);
    const [event] = changes.events();
    expect(event.previousState).toEqual(before);
    expect(event.newState).toEqual(instance.state.get());
    expect(event.previousState.showUnreadIndicator).toBe(false);
    expect(event.newState.showUnreadIndicator).toBe(true);
  });

  // The JSDoc names viewState as one of the fields that fire it.
  it('fires for a view change, from the old view to the new one', async () => {
    const { instance } = await contractChat();
    const changes = recordStateChanges(instance);
    await act(() => instance.changeView(ViewType.MAIN_WINDOW));
    const events = changes.events();
    // One changeView makes several public changes; `main` fires one event for
    // each, so only the first and last are pinned.
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].previousState.viewState.mainWindow).toBe(false);
    expect(events[events.length - 1].newState.viewState.mainWindow).toBe(true);
  });

  it('does not fire when no public field changed', async () => {
    const { instance } = await contractChat();
    const changes = recordStateChanges(instance);
    act(() => instance.updateInputFieldVisibility(false));
    showUnread(instance, false);
    expect(changes.events()).toEqual([]);
  });

  it('freezes previousState and newState', async () => {
    const { instance } = await contractChat();
    const changes = recordStateChanges(instance);
    showUnread(instance);
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
    showUnread(instance);
    expect(reads).toEqual([true, true]);
  });

  // Not in the JSDoc: for one change, `main` fires the event before it calls
  // the state.subscribe listeners.
  it('fires before the state.subscribe listeners for the same change', async () => {
    const { instance } = await contractChat();
    const order: string[] = [];
    instance.state.subscribe(() => order.push('subscribe'));
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: () => order.push('state:change'),
    });
    showUnread(instance);
    expect(order).toEqual(['state:change', 'subscribe']);
  });

  // src/types/instance/PublicChatState.ts:66: input.focused "toggles in the
  // same dispatch pass as the underlying focus event, so subscribing via
  // STATE_CHANGE fires once per focus/blur transition".
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
    // A short wait after each transition proves no second event follows it.
    const settle = () =>
      act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

    await act(async () => {
      editor.commands.focus();
    });
    await waitFor(() => expect(transitions()).toEqual(['false->true']));
    await settle();
    expect(transitions()).toEqual(['false->true']);
    changes.clear();

    await act(async () => {
      editor.commands.blur();
    });
    await waitFor(() => expect(transitions()).toEqual(['true->false']));
    await settle();
    expect(transitions()).toEqual(['true->false']);
  });
});
