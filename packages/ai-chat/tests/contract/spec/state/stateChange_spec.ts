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
import {
  changeView,
  contractChat,
  contractSetup,
  pause,
  recordEvents,
  showUnread,
} from '../../helpers';

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
  it('fires for a view change, from the old view to the new one', async () => {
    const { instance } = await contractChat();
    const changes = recordStateChanges(instance);
    await changeView(instance, ViewType.MAIN_WINDOW);
    const events = changes.events();
    // One changeView makes several public changes, and `main` fires one event
    // for each (MAIN-NOTES M41), so only the first and last are pinned.
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].previousState.viewState.mainWindow).toBe(false);
    expect(events[events.length - 1].newState.viewState.mainWindow).toBe(true);
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
